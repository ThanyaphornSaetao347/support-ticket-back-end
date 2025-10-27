// notification.gateway.ts
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
    origin: 'http://localhost:4200', // หรือ config ตาม frontend URL
    credentials: true,
  },
  namespace: '/notifications', // แยก namespace สำหรับ notifications
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedUsers = new Map<number, string[]>(); // userId -> socketIds[]

  constructor(private jwtService: JwtService) {}

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
      
      // Join personal room
      client.join(`user_${userId}`);
      
      this.logger.log(`User ${userId} connected via WebSocket: ${client.id}`);
      
      // ส่งการแจ้งเตือนว่าเชื่อมต่อสำเร็จ
      client.emit('connection_success', {
        message: 'เชื่อมต่อระบบการแจ้งเตือนสำเร็จ',
        userId,
        socketId: client.id,
      });

    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.findUserBySocketId(client.id);
    
    if (userId) {
      this.removeUserSocket(userId, client.id);
      this.logger.log(`User ${userId} disconnected: ${client.id}`);
    }
  }

  // รับการ subscribe จาก client
  @SubscribeMessage('subscribe_notifications')
  handleSubscribeNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId?: number }
  ) {
    const userId = data.userId;
    if (userId) {
      client.join(`user_${userId}`);
      client.emit('subscribed', { userId, message: 'Subscribed to notifications' });
      this.logger.log(`User ${userId} subscribed to notifications`);
    }
  }

  // ส่งการแจ้งเตือนไปยัง user เฉพาะ
  async sendNotificationToUser(userId: number, notification: any) {
    try {
      const room = `user_${userId}`;
      this.server.to(room).emit('new_notification', {
        ...notification,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Notification sent to user ${userId}: ${notification.title}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error sending notification to user ${userId}:`, error);
      return false;
    }
  }

  // ส่งการแจ้งเตือนไปยัง multiple users
  async sendNotificationToUsers(userIds: number[], notification: any) {
    const results = await Promise.all(
      userIds.map(userId => this.sendNotificationToUser(userId, notification))
    );
    
    const successCount = results.filter(Boolean).length;
    this.logger.log(`Notification sent to ${successCount}/${userIds.length} users`);
    
    return { success: successCount, total: userIds.length };
  }

  // ส่งการแจ้งเตือนแบบ broadcast ไป admin ทั้งหมด
  async broadcastToAdmins(notification: any) {
    this.server.emit('admin_notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Admin notification broadcasted: ${notification.title}`);
  }

  // ส่งการอัพเดท unread count
  async updateUnreadCount(userId: number, count: number) {
    const room = `user_${userId}`;
    this.server.to(room).emit('unread_count_update', {
      userId,
      unread_count: count,
      timestamp: new Date().toISOString(),
    });
  }

  // Helper methods
  private async extractUserIdFromSocket(client: Socket): Promise<number | null> {
    try {
      const token = client.handshake.auth?.token || 
                   client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return null;
      }

      const decoded = this.jwtService.verify(token);
      return decoded.id || decoded.userId || decoded.sub;
    } catch (error) {
      this.logger.error(`JWT verification failed: ${error.message}`);
      return null;
    }
  }

  private addUserSocket(userId: number, socketId: string) {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, []);
    }
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.push(socketId);
    }
  }

  private removeUserSocket(userId: number, socketId: string) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      const index = userSockets.indexOf(socketId);
      if (index > -1) {
        userSockets.splice(index, 1);
      }
      if (userSockets.length === 0) {
        this.connectedUsers.delete(userId);
      }
    }
  }

  private findUserBySocketId(socketId: string): number | null {
    for (const [userId, socketIds] of this.connectedUsers.entries()) {
      if (socketIds.includes(socketId)) {
        return userId;
      }
    }
    return null;
  }

  // Utility methods สำหรับ monitoring
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  getConnectedUsers(): number[] {
    return Array.from(this.connectedUsers.keys());
  }

  isUserConnected(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }
}