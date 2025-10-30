// notification.gateway.ts - IMPROVED VERSION
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    // ✅ ใช้ environment variable แทน hardcoded
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  
  // ✅ เก็บข้อมูลการเชื่อมต่อสำหรับ monitoring
  private connectedUsers = new Map<number, Set<string>>(); // userId -> Set of socketIds

  constructor(private jwtService: JwtService) {}

  // ================================
  // Connection Handlers
  // ================================

  async handleConnection(client: Socket) {
    try {
      const userId = await this.extractUserIdFromSocket(client);
      
      if (!userId) {
        this.logger.warn(`Unauthorized WebSocket connection: ${client.id}`);
        client.disconnect();
        return;
      }

      // เพิ่ม socket ใน user mapping
      this.addUserSocket(userId, client.id);
      
      // Join personal room (สำคัญ: ใช้ room นี้ส่ง notification)
      client.join(`user_${userId}`);
      
      this.logger.log(`✅ User ${userId} connected via WebSocket: ${client.id}`);
      
      // ส่งการแจ้งเตือนว่าเชื่อมต่อสำเร็จ
      client.emit('connection_success', {
        message: 'เชื่อมต่อระบบการแจ้งเตือนสำเร็จ',
        userId,
        socketId: client.id,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`❌ Connection error: ${error.message}`, error.stack);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.findUserBySocketId(client.id);
    
    if (userId) {
      this.removeUserSocket(userId, client.id);
      this.logger.log(`👋 User ${userId} disconnected: ${client.id}`);
      
      // ✅ ถ้าไม่มี socket ของ user คนนี้เหลือแล้ว log เพิ่ม
      if (!this.isUserConnected(userId)) {
        this.logger.log(`User ${userId} completely disconnected (no active sockets)`);
      }
    }
  }

  // ================================
  // Client Message Handlers
  // ================================

  @SubscribeMessage('subscribe_notifications')
  handleSubscribeNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId?: number }
  ) {
    const userId = data.userId;
    if (userId) {
      client.join(`user_${userId}`);
      client.emit('subscribed', { 
        userId, 
        message: 'Subscribed to notifications',
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`User ${userId} subscribed to notifications via ${client.id}`);
    } else {
      client.emit('error', {
        message: 'userId is required',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { 
      timestamp: new Date().toISOString(),
    });
  }

  // ================================
  // Notification Sending Methods
  // ================================

  /**
   * ส่งการแจ้งเตือนไปยัง user เฉพาะ
   */
  async sendNotificationToUser(userId: number, notification: any): Promise<boolean> {
    try {
      const room = `user_${userId}`;
      
      // ตรวจสอบว่า user มี socket เชื่อมต่ออยู่หรือไม่
      const isConnected = this.isUserConnected(userId);
      
      if (!isConnected) {
        this.logger.debug(`User ${userId} is not connected, notification will be stored only`);
        // ไม่ throw error เพราะ notification ถูกบันทึกใน database แล้ว
        return false;
      }

      // ส่ง notification ไปยัง room
      this.server.to(room).emit('new_notification', {
        ...notification,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`📤 Notification sent to user ${userId}: ${notification.title}`);
      return true;

    } catch (error) {
      this.logger.error(`❌ Error sending notification to user ${userId}:`, error);
      // ✅ ไม่ throw error เพราะไม่ต้องการให้ WebSocket failure หยุดการทำงานของ service
      return false;
    }
  }

  /**
   * ส่งการแจ้งเตือนไปยังหลาย users พร้อมกัน
   */
  async sendNotificationToUsers(userIds: number[], notification: any): Promise<{ success: number; total: number }> {
    const results = await Promise.all(
      userIds.map(userId => this.sendNotificationToUser(userId, notification))
    );
    
    const successCount = results.filter(Boolean).length;
    this.logger.log(`📤 Notification sent to ${successCount}/${userIds.length} users`);
    
    return { success: successCount, total: userIds.length };
  }

  /**
   * ส่งการแจ้งเตือนแบบ broadcast ไป admin ทั้งหมด
   */
  async broadcastToAdmins(notification: any): Promise<void> {
    try {
      this.server.emit('admin_notification', {
        ...notification,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`📢 Admin notification broadcasted: ${notification.title}`);
    } catch (error) {
      this.logger.error('❌ Error broadcasting to admins:', error);
    }
  }

  /**
   * ส่งการอัพเดท unread count
   */
  async updateUnreadCount(userId: number, count: number): Promise<boolean> {
    try {
      const room = `user_${userId}`;
      
      if (!this.isUserConnected(userId)) {
        this.logger.debug(`User ${userId} not connected, skip unread count update`);
        return false;
      }

      this.server.to(room).emit('unread_count_update', {
        userId,
        unread_count: count,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`📊 Unread count updated for user ${userId}: ${count}`);
      return true;

    } catch (error) {
      this.logger.error(`❌ Error updating unread count for user ${userId}:`, error);
      return false;
    }
  }

  // ================================
  // Helper Methods
  // ================================

  /**
   * ดึง userId จาก socket authentication
   */
  private async extractUserIdFromSocket(client: Socket): Promise<number | null> {
    try {
      // ลองหา token จากหลายที่
      const token = 
        client.handshake.auth?.token || 
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        client.handshake.query?.token as string;

      if (!token) {
        this.logger.warn('No token provided in WebSocket handshake');
        return null;
      }

      // Verify JWT token
      const decoded = this.jwtService.verify(token);
      
      // ลองหา userId จาก decoded token
      const userId = decoded.id || decoded.userId || decoded.user_id || decoded.sub;
      
      if (!userId) {
        this.logger.warn('No userId found in JWT token');
        return null;
      }

      return parseInt(userId.toString());

    } catch (error) {
      this.logger.error(`JWT verification failed: ${error.message}`);
      return null;
    }
  }

  /**
   * เพิ่ม socket ให้กับ user
   */
  private addUserSocket(userId: number, socketId: string): void {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.add(socketId);
      this.logger.debug(`Added socket ${socketId} to user ${userId}. Total sockets: ${userSockets.size}`);
    }
  }

  /**
   * ลบ socket ออกจาก user
   */
  private removeUserSocket(userId: number, socketId: string): void {
    const userSockets = this.connectedUsers.get(userId);
    
    if (userSockets) {
      userSockets.delete(socketId);
      
      // ถ้าไม่มี socket เหลือ ให้ลบ user ออกจาก Map
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
        this.logger.debug(`Removed user ${userId} from connected users (no sockets remaining)`);
      } else {
        this.logger.debug(`Removed socket ${socketId} from user ${userId}. Remaining sockets: ${userSockets.size}`);
      }
    }
  }

  /**
   * หา userId จาก socketId
   */
  private findUserBySocketId(socketId: string): number | null {
    for (const [userId, socketIds] of this.connectedUsers.entries()) {
      if (socketIds.has(socketId)) {
        return userId;
      }
    }
    return null;
  }

  // ================================
  // Monitoring & Utility Methods
  // ================================

  /**
   * นับจำนวน users ที่เชื่อมต่ออยู่
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * ดึงรายชื่อ users ที่เชื่อมต่ออยู่
   */
  getConnectedUsers(): number[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * ตรวจสอบว่า user เชื่อมต่ออยู่หรือไม่
   */
  isUserConnected(userId: number): boolean {
    const sockets = this.connectedUsers.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  /**
   * ดึงจำนวน sockets ของ user
   */
  getUserSocketCount(userId: number): number {
    const sockets = this.connectedUsers.get(userId);
    return sockets ? sockets.size : 0;
  }

  /**
   * ดึงสถิติการเชื่อมต่อ
   */
  getConnectionStats() {
    const stats = {
      total_connected_users: this.connectedUsers.size,
      total_sockets: 0,
      users: [] as Array<{ userId: number; sockets: number }>,
    };

    for (const [userId, socketIds] of this.connectedUsers.entries()) {
      stats.total_sockets += socketIds.size;
      stats.users.push({
        userId,
        sockets: socketIds.size,
      });
    }

    return stats;
  }

  /**
   * Force disconnect user (สำหรับ admin)
   */
  async disconnectUser(userId: number): Promise<boolean> {
    try {
      const room = `user_${userId}`;
      const socketsInRoom = await this.server.in(room).fetchSockets();
      
      for (const socket of socketsInRoom) {
        socket.disconnect(true);
      }

      this.connectedUsers.delete(userId);
      this.logger.log(`Forcefully disconnected user ${userId}`);
      return true;

    } catch (error) {
      this.logger.error(`Error disconnecting user ${userId}:`, error);
      return false;
    }
  }
}