import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Users } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto'
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(Users)
    private userRepository: Repository<Users>,
  ) {}

  async findByEmail(email: string): Promise<Users> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(createUserDto: CreateUserDto) {
    if (!createUserDto.email) {
      return {
        code: '3',
        message: 'กรุณาระบุอีเมล'
      };
    }
    
    // ตรวจสอบทั้ง username และ email ว่ามีในระบบแล้วหรือไม่
    const existingUsername = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existingUsername) {
      return {
        code: '2',
        message: 'สร้างผู้ใช้ไม่สำเร็จ มีชื่อผู้ใช้นี้ในระบบแล้ว',
      };
    }
    
    const existingEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingEmail) {
      return {
        code: '2',
        message: 'สร้างผู้ใช้ไม่สำเร็จ มีอีเมลนี้ในระบบแล้ว',
      };
    }

    // เข้ารหัสรหัสผ่านก่อนบันทึก
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    console.log('DTO:', createUserDto);

    const user = this.userRepository.create({
      username: createUserDto.username,
      password: hashedPassword,
      email: createUserDto.email,
      firstname: createUserDto.firstname,
      lastname: createUserDto.lastname,
      phone: createUserDto.phone,
      create_by: createUserDto.create_by,
      update_by: createUserDto.update_by,
    });

    
    try {
      const result = await this.userRepository.save(user);
      if (!result) {
        return {
          code: '4',
          message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
        };
      }

      // ตอนนี้เรารู้แล้วว่า result ไม่เป็น null
      // const { password, create_date, ...userData } = result;

      return {
        code: '1',
        message: 'บันทึกสำเร็จ',
        data: result,
      };
    } catch (error: unknown) {
      // จัดการกับ error ซึ่งมีประเภทเป็น unknown
      let errorMessage = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      
      // ตรวจสอบว่า error เป็น Error object หรือไม่
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        code: '4',
        message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
        error: errorMessage
      };
    }
  }
  // ลบฟังก์ชัน createUser เนื่องจากซ้ำซ้อนกับ create และไม่มีการเข้ารหัสรหัสผ่าน

  findAll(filter: {username?: string; email?: string}) {
    const where: any = {};

    if (filter.username) {
      where.username = Like(`%${filter.username}%`);
    }

    if (filter.email) {
      where.email = Like(`%${filter.email}%`);
    }
    
    return this.userRepository.find({ 
      where,
      select: [
        'id', 
        'username', 
        'password', 
        'email', 
        'firstname', 
        'lastname', 
        'phone', 
        'isenabled',
        'start_date',
        'end_date',
        'create_date',
        'create_by',
        'update_date',
        'update_by',
      ] // เลือกเฉพาะข้อมูลที่จำเป็น ไม่รวมรหัสผ่าน
    });
  }

  async findOne(id: number) {
  const user = await this.userRepository.findOneBy({ id });
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  // เราแน่ใจแล้วว่า user ไม่เป็น null จึงสามารถทำ destructuring ได้อย่างปลอดภัย
  const { password, ...result } = user;
  return result;
}

  async findByUsername(username: string) {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      return null;
    }
    return user;
  }

  async findById(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return null;
    }
    return user;
  }


  async update(user_id: number, updateUserDto: UpdateUserDto) {
  const user = await this.findOne(user_id);
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  // ถ้ามีการอัปเดตรหัสผ่าน ให้เข้ารหัสก่อน
  if (updateUserDto.password) {
    updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
  }

  updateUserDto.update_date = new Date();
  
  await this.userRepository.update(user_id, updateUserDto);
  
  const updatedUser = await this.userRepository.findOneBy({ id: user_id });
  if (!updatedUser) {
    throw new NotFoundException('User not found after update');
  }
  
  // ใช้ spread operator แยกรหัสผ่านออกจากข้อมูลผู้ใช้
  const { password, ...result } = updatedUser;
  
  return {
    code: '1',
    message: 'อัปเดตสำเร็จ',
    data: result
  };
}

  async remove(user_id: number) {
    const user = await this.findOne(user_id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    await this.userRepository.delete(user_id);
    
    return {
      code: '1',
      message: 'ลบข้อมูลสำเร็จ'
    };
  }
}
