export enum  permissionEnum {
    CREATE_TICKET = 1,          // แจ้งปัญหา
    TRACK_TICKET = 2,           // ติดตามปัญหา
    EDIT_TICKET = 3,            // แก้ไข ticket
    DELETE_TICKET = 4,          // ลบ ticket
    CHANGE_STATUS = 5,          // เปลี่ยนสถานะของ ticket
    REPLY_TICKET = 6,           // ตอบกลับ ticket
    CLOSE_TICKET = 7,           // ปิด ticket
    SOLVE_PROBLEM = 8,          // แก้ไขปัญหา
    ASSIGNEE = 9,               // ผู้รับเรื่อง
    OPEN_TICKET = 10,           // เปิด ticket
    RESTORE_TICKET = 11,        // กู้คืน ticket
    VIEW_OWN_TICKETS = 12,      // ✅ ดูตั๋วทั้งหมดที่ตัวเองสร้าง
    VIEW_ALL_TICKETS = 13,      // ดูตั๋วทั้งหมด
    SATISFACTION = 14,          // ประเมินความพึงพอใจ
  };