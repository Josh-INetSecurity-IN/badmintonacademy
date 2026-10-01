import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding badminton academy database...');

  // ============ USERS ============
  const password = await bcrypt.hash('ChangeMe@123', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@academy.com' },
    update: {},
    create: {
      email: 'superadmin@academy.com',
      password,
      firstName: 'Super',
      lastName: 'Admin',
      phone: '9876543210',
      role: 'super_admin',
      isActive: true,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@academy.com' },
    update: {},
    create: {
      email: 'manager@academy.com',
      password,
      firstName: 'Academy',
      lastName: 'Manager',
      phone: '9876543211',
      role: 'admin',
      isActive: true,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@academy.com' },
    update: {},
    create: {
      email: 'staff@academy.com',
      password,
      firstName: 'Reception',
      lastName: 'Staff',
      phone: '9876543212',
      role: 'staff',
      isActive: true,
    },
  });

  console.log('  Users created:', superAdmin.email, manager.email, staff.email);

  // ============ ACADEMY SETTINGS ============
  const settings: { key: string; value: string; group: string; type: string }[] = [
    // General
    { key: 'academy_name', value: 'SmashZone Badminton Academy', group: 'general', type: 'text' },
    { key: 'tagline', value: 'Train Hard. Play Smart. Win Big.', group: 'general', type: 'text' },
    { key: 'phone', value: '+91 98765 43210', group: 'general', type: 'text' },
    { key: 'whatsapp_number', value: '919876543210', group: 'general', type: 'text' },
    { key: 'email', value: 'info@smashzone.academy', group: 'general', type: 'text' },
    { key: 'address', value: 'Plot 42, Sports Complex Road, Gandhi Nagar, Hyderabad', group: 'general', type: 'text' },
    { key: 'opening_hours', value: 'Mon - Sun: 6:00 AM - 10:00 PM', group: 'general', type: 'text' },
    { key: 'currency', value: 'INR', group: 'general', type: 'text' },
    { key: 'invoice_prefix', value: 'INV', group: 'general', type: 'text' },
    { key: 'footer_text', value: 'Your premier destination for professional badminton coaching, regular play and competitive tournaments.', group: 'general', type: 'text' },
    { key: 'facebook', value: 'https://facebook.com', group: 'general', type: 'text' },
    { key: 'instagram', value: 'https://instagram.com', group: 'general', type: 'text' },
    { key: 'youtube', value: 'https://youtube.com', group: 'general', type: 'text' },
    // Website / About
    { key: 'about_heading', value: 'Building Champions, One Rally at a Time', group: 'website', type: 'text' },
    { key: 'about_image', value: '/images/about.png', group: 'website', type: 'text' },
    {
      key: 'about_description',
      value: 'SmashZone Badminton Academy is a premier training center offering structured coaching for beginners to advanced players. With certified coaches, professional courts and a proven training methodology, we help players of all ages reach their full potential.',
      group: 'website',
      type: 'textarea',
    },
    { key: 'mission', value: 'To nurture every player\'s potential through structured training, personalized attention and a passion for excellence.', group: 'website', type: 'textarea' },
    { key: 'vision', value: 'To be the region\'s leading badminton academy producing state and national level champions.', group: 'website', type: 'textarea' },
    { key: 'years_experience', value: '12', group: 'website', type: 'text' },
    { key: 'maps_embed_url', value: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.2!2d78.47!3d17.44!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDI2JzI0LjAiTiA3OMKwMjgnMTIuMCJF!5e0!3m2!1sen!2sin!4v1700000000000', group: 'website', type: 'text' },
    { key: 'latitude', value: '17.4440', group: 'website', type: 'text' },
    { key: 'longitude', value: '78.4700', group: 'website', type: 'text' },
    // Payment settings
    { key: 'receipt_prefix', value: 'RCP', group: 'payment', type: 'text' },
    { key: 'tax_enabled', value: 'false', group: 'payment', type: 'boolean' },
    { key: 'due_reminder_days', value: '3', group: 'notification', type: 'number' },
    { key: 'overdue_notifications', value: 'true', group: 'notification', type: 'boolean' },
    { key: 'low_stock_alerts', value: 'true', group: 'notification', type: 'boolean' },
    { key: 'reminder_template', value: 'Hello {name},\n\nA gentle reminder from {academy} that your {fee_type} of {amount} for {billing_month} is due on {due_date}.\n\nKindly make the payment at your convenience.\n\nIf you have already paid, please ignore this message.\n\nThank you,\n{academy}', group: 'notification', type: 'textarea' },
  ];

  for (const s of settings) {
    await prisma.academySetting.upsert({
      where: { key: s.key },
      update: { value: s.value, group: s.group, type: s.type },
      create: s,
    });
  }
  console.log('  Settings created:', settings.length);

  // ============ COACHES ============
  const coachNames = [
    { firstName: 'Rajesh', lastName: 'Kumar', spec: 'Advanced coaching, State-level ex-player', exp: '15 years' },
    { firstName: 'Priya', lastName: 'Sharma', spec: 'Kids coaching, Fundamentals', exp: '10 years' },
    { firstName: 'Vikram', lastName: 'Singh', spec: 'Conditioning, Doubles specialist', exp: '12 years' },
    { firstName: 'Anita', lastName: 'Reddy', spec: 'Intermediate coaching, Fitness', exp: '8 years' },
  ];
  const coaches = [];
  for (const c of coachNames) {
    const coach = await prisma.coach.create({
      data: {
        firstName: c.firstName,
        lastName: c.lastName,
        phone: '90000' + Math.floor(10000 + Math.random() * 89999),
        email: `${c.firstName.toLowerCase()}.${c.lastName.toLowerCase()}@academy.com`,
        specialization: c.spec,
        experience: c.exp,
        isActive: true,
      },
    });
    coaches.push(coach);
  }
  console.log('  Coaches created:', coaches.length);

  // ============ COURTS ============
  const courtNames = ['Court 1', 'Court 2', 'Court 3', 'Court 4'];
  const courts = [];
  for (const name of courtNames) {
    const court = await prisma.court.create({
      data: {
        name,
        courtType: 'indoor',
        surfaceType: 'Synthetic PU',
        location: 'Main Hall',
        hourlyRate: new Prisma.Decimal(500),
        status: 'available',
      },
    });
    courts.push(court);
  }
  console.log('  Courts created:', courts.length);

  // ============ COACHING BATCHES ============
  const batchDefs = [
    { name: 'Kids Fundamentals (K1)', programType: 'kids', skillLevel: 'beginner', ageGroup: '6-10 yrs', coach: 1, court: 0, capacity: 12, days: ['Monday', 'Wednesday', 'Friday'], start: '16:00', end: '17:00', fee: 1500, color: '#f59e0b' },
    { name: 'Junior Beginners (JB1)', programType: 'beginners', skillLevel: 'beginner', ageGroup: '10-14 yrs', coach: 1, court: 1, capacity: 15, days: ['Tuesday', 'Thursday', 'Saturday'], start: '17:00', end: '18:00', fee: 2000, color: '#3b82f6' },
    { name: 'Intermediate Group (IG1)', programType: 'intermediate', skillLevel: 'intermediate', ageGroup: '14-18 yrs', coach: 2, court: 2, capacity: 10, days: ['Monday', 'Wednesday', 'Friday'], start: '18:00', end: '19:30', fee: 2500, color: '#8b5cf6' },
    { name: 'Advanced Squad (A1)', programType: 'advanced', skillLevel: 'advanced', ageGroup: 'Open', coach: 0, court: 0, capacity: 8, days: ['Monday', 'Tuesday', 'Thursday', 'Friday'], start: '06:00', end: '08:00', fee: 4000, color: '#ef4444' },
    { name: 'Morning Beginners (MB1)', programType: 'beginners', skillLevel: 'beginner', ageGroup: 'Adults', coach: 3, court: 3, capacity: 12, days: ['Tuesday', 'Thursday', 'Saturday'], start: '06:00', end: '07:00', fee: 2000, color: '#06b6d4' },
    { name: 'Professional Training (PT1)', programType: 'professional', skillLevel: 'advanced', ageGroup: 'Open', coach: 0, court: 1, capacity: 6, days: ['Monday', 'Wednesday', 'Friday', 'Saturday'], start: '07:00', end: '09:00', fee: 6000, color: '#22c55e' },
  ];

  const batches = [];
  for (let i = 0; i < batchDefs.length; i++) {
    const b = batchDefs[i];
    const batch = await prisma.coachingBatch.create({
      data: {
        name: b.name,
        programType: b.programType,
        skillLevel: b.skillLevel,
        ageGroup: b.ageGroup,
        coachId: coaches[b.coach].id,
        courtId: courts[b.court].id,
        maxCapacity: b.capacity,
        daysOfWeek: JSON.stringify(b.days),
        startTime: b.start,
        endTime: b.end,
        startDate: new Date(),
        monthlyFee: new Prisma.Decimal(b.fee),
        registrationFee: new Prisma.Decimal(500),
        color: b.color,
        status: 'active',
      },
    });
    batches.push(batch);
  }
  console.log('  Coaching batches created:', batches.length);

  // ============ STUDENTS ============
  const studentNames = [
    ['Aarav', 'Patel', 'Male', '10'], ['Diya', 'Shah', 'Female', '12'],
    ['Vivaan', 'Gupta', 'Male', '9'], ['Ananya', 'Iyer', 'Female', '14'],
    ['Advik', 'Kulkarni', 'Male', '11'], ['Sara', 'Khan', 'Female', '13'],
    ['Arjun', 'Nair', 'Male', '16'], ['Ishita', 'Das', 'Female', '15'],
    ['Reyansh', 'Mehta', 'Male', '8'], ['Navya', 'Rao', 'Female', '10'],
    ['Krish', 'Bose', 'Male', '17'], ['Myra', 'Chopra', 'Female', '12'],
    ['Rudra', 'Pillai', 'Male', '13'], ['Kiara', 'Verma', 'Female', '9'],
    ['Aditya', 'Menon', 'Male', '15'], ['Zara', 'Bhatt', 'Female', '11'],
    ['Dhruv', 'Joshi', 'Male', '14'], ['Aadhya', 'Sinha', 'Female', '16'],
    ['Kabir', 'Gill', 'Male', '12'], ['Tara', 'Dutta', 'Female', '9'],
    ['Aryan', 'Malhotra', 'Male', '18'], ['Inaya', 'Chawla', 'Female', '13'],
    ['Rohan', 'Kapoor', 'Male', '10'], ['Anika', 'Saxena', 'Female', '14'],
    ['Shaurya', 'Bakshi', 'Male', '11'], ['Yashvi', 'Talwar', 'Female', '15'],
    ['Ishaan', 'Bhatia', 'Male', '16'], ['Tanisha', 'Goswami', 'Female', '12'],
  ];

  const students = [];
  const skillLevels = ['beginner', 'intermediate', 'advanced'];
  for (let i = 0; i < studentNames.length; i++) {
    const [fn, ln, gender, ageStr] = studentNames[i];
    const birthYear = new Date().getFullYear() - Number(ageStr);
    const dob = new Date(birthYear, Math.floor(Math.random() * 12), Math.floor(1 + Math.random() * 27));
    const skill = skillLevels[i % 3];
    const admissionNumber = `ADM-${new Date().getFullYear()}-${String(1000 + i)}`;
    const student = await prisma.student.create({
      data: {
        admissionNumber,
        firstName: fn,
        lastName: ln,
        gender,
        dateOfBirth: dob,
        parentName: `${fn} ${ln} Sr.`,
        parentPhone: '98' + String(Math.floor(10000000 + Math.random() * 89999999)),
        phone: '91' + String(Math.floor(1000000000 + Math.random() * 8999999999)),
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
        address: `${20 + i} Lakeview Colony, Hyderabad`,
        emergencyContact: `98${String(Math.floor(10000000 + Math.random() * 89999999))}`,
        joiningDate: new Date(2024, Math.floor(Math.random() * 10), Math.floor(1 + Math.random() * 28)),
        skillLevel: skill,
        coachingProgram: batchDefs[i % batchDefs.length].programType,
        monthlyFee: new Prisma.Decimal(1500 + (i % 4) * 500),
        admissionFee: new Prisma.Decimal(500),
        discount: new Prisma.Decimal(i % 5 === 0 ? 200 : 0),
        feeDueDay: 5,
        status: i % 6 === 5 ? 'inactive' : 'active',
      },
    });

    // Assign to a batch
    const batchIdx = i % batchDefs.length;
    await prisma.batchStudent.create({
      data: {
        batchId: batches[batchIdx].id,
        studentId: student.id,
        joiningDate: new Date(),
        status: 'active',
      },
    });
    students.push(student);
  }
  console.log('  Students created:', students.length);

  // ============ REGULAR BATCHES ============
  const regBatchDefs = [
    { name: 'Morning Regular A', court: 0, days: ['Monday', 'Wednesday', 'Friday'], start: '06:00', end: '07:00', max: 8, price: 2000 },
    { name: 'Morning Regular B', court: 1, days: ['Tuesday', 'Thursday', 'Saturday'], start: '06:00', end: '07:00', max: 8, price: 2000 },
    { name: 'Evening Regular A', court: 2, days: ['Monday', 'Tuesday', 'Friday'], start: '19:30', end: '20:30', max: 8, price: 2500 },
    { name: 'Weekend Regular', court: 3, days: ['Saturday', 'Sunday'], start: '08:00', end: '09:30', max: 10, price: 3000 },
    { name: 'Lunch Break Casual', court: 0, days: ['Wednesday', 'Saturday'], start: '12:00', end: '13:00', max: 8, price: 2000 },
  ];
  const regBatches = [];
  for (const b of regBatchDefs) {
    const batch = await prisma.regularBatch.create({
      data: {
        name: b.name,
        courtId: courts[b.court].id,
        daysOfWeek: JSON.stringify(b.days),
        startTime: b.start,
        endTime: b.end,
        maxPlayers: b.max,
        monthlyPrice: new Prisma.Decimal(b.price),
        startDate: new Date(),
        status: 'active',
      },
    });
    regBatches.push(batch);
  }
  console.log('  Regular batches created:', regBatches.length);

  // ============ REGULAR PLAYERS ============
  const playerNames = [
    ['Suresh', 'Rao'], ['Lakshmi', 'Menon'], ['Deepak', 'Kaushik'], ['Meera', 'Nair'],
    ['Nikhil', 'Arora'], ['Kavya', 'Ram'], ['Sanjay', 'Trivedi'], ['Ritika', 'Seth'],
    ['Prakash', 'Rana'], ['Shweta', 'Malik'], ['Vinod', 'Chauhan'], ['Pooja', 'Desai'],
    ['Harish', 'Tandon'], ['Neha', 'Bajaj'], ['Manoj', 'Suri'], ['Anjali', 'Garg'],
  ];
  const players = [];
  const playerStatuses = ['active', 'active', 'active', 'payment_due', 'overdue', 'expired', 'paused', 'active'];
  for (let i = 0; i < playerNames.length; i++) {
    const [fn, ln] = playerNames[i];
    const status = playerStatuses[i % playerStatuses.length];
    const subscriptionStart = new Date();
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
    const player = await prisma.regularPlayer.create({
      data: {
        playerId: `REG-${new Date().getFullYear()}-${String(2000 + i)}`,
        firstName: fn,
        lastName: ln,
        phone: '97' + String(Math.floor(1000000000 + Math.random() * 8999999999)),
        whatsappNumber: '91' + String(Math.floor(1000000000 + Math.random() * 8999999999)),
        email: `${fn.toLowerCase()}@example.com`,
        address: `${300 + i} Green Park, Hyderabad`,
        joiningDate: new Date(2024, Math.floor(Math.random() * 10), Math.floor(1 + Math.random() * 28)),
        monthlyFee: new Prisma.Decimal(2000 + (i % 3) * 500),
        securityDeposit: new Prisma.Decimal(i % 4 === 0 ? 2000 : 0),
        paymentFrequency: 'monthly',
        subscriptionStart,
        subscriptionEnd,
        nextPaymentDue: subscriptionEnd,
        status,
      },
    });

    // Assign to regular batch
    const batchIdx = i % regBatches.length;
    await prisma.regularPlayerAssignment.create({
      data: {
        playerId: player.id,
        batchId: regBatches[batchIdx].id,
        joiningDate: new Date(),
        status: 'active',
      },
    });
    players.push(player);
  }
  console.log('  Regular players created:', players.length);

  // ============ GUEST BOOKINGS ============
  const today = new Date();
  for (let i = 0; i < 6; i++) {
    const visitDate = new Date(today);
    visitDate.setDate(visitDate.getDate() + (i % 3));
    const courtIdx = i % courts.length;
    const startH = 8 + (i % 8);
    await prisma.guestBooking.create({
      data: {
        bookingNumber: `GST-${new Date().getFullYear()}-${String(3000 + i)}`,
        name: `Guest Player ${i + 1}`,
        phone: '99' + String(Math.floor(1000000000 + Math.random() * 8999999999)),
        whatsappNumber: '91' + String(Math.floor(1000000000 + Math.random() * 8999999999)),
        visitDate,
        courtId: courts[courtIdx].id,
        startTime: `${String(startH).padStart(2, '0')}:00`,
        endTime: `${String(startH + 1).padStart(2, '0')}:00`,
        numberOfPlayers: 2 + (i % 3),
        amount: new Prisma.Decimal(500),
        paymentMethod: i % 2 === 0 ? 'upi' : 'cash',
        paymentStatus: 'paid',
        bookingStatus: i % 3 === 2 ? 'completed' : 'confirmed',
      },
    });
  }
  console.log('  Guest bookings created: 6');

  // ============ PAYMENTS / FEES ============
  const currentMonth = today.toISOString().slice(0, 7);

  // Generate fee invoices for active students
  for (const student of students) {
    if (student.status !== 'active') continue;
    const amount = Number(student.monthlyFee);
    const discount = Number(student.discount);
    const totalAmount = amount - discount;
    const fee = await prisma.feeInvoice.create({
      data: {
        invoiceNumber: `INV-${currentMonth}-${String(1000 + student.id)}`,
        studentId: student.id,
        billingMonth: currentMonth,
        amount: new Prisma.Decimal(amount),
        discount: new Prisma.Decimal(discount),
        tax: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(totalAmount),
        paidAmount: new Prisma.Decimal(0),
        dueDate: new Date(today.getFullYear(), today.getMonth(), 5),
        status: student.id % 4 === 0 ? 'due-soon' : student.id % 5 === 0 ? 'overdue' : 'pending',
      },
    });
    // Make some paid
    if (student.id % 7 === 0) {
      const paid = new Prisma.Decimal(totalAmount);
      await prisma.payment.create({
        data: {
          receiptNumber: `RCP-${currentMonth}-${String(4000 + student.id)}`,
          studentId: student.id,
          feeInvoiceId: fee.id,
          category: 'coaching_fee',
          description: `Coaching fee for ${currentMonth}`,
          amount: new Prisma.Decimal(amount),
          discount: new Prisma.Decimal(discount),
          tax: new Prisma.Decimal(0),
          finalAmount: paid,
          paymentDate: new Date(),
          dueDate: new Date(today.getFullYear(), today.getMonth(), 5),
          paymentMethod: student.id % 3 === 0 ? 'upi' : 'cash',
          status: 'paid',
          collectedBy: superAdmin.id,
        },
      });
    }
  }

  // Generate invoices for regular players
  for (const player of players) {
    if (player.status === 'cancelled') continue;
    const amount = Number(player.monthlyFee);
    const fee = await prisma.feeInvoice.create({
      data: {
        invoiceNumber: `INV-${currentMonth}-R${String(5000 + player.id)}`,
        regularPlayerId: player.id,
        billingMonth: currentMonth,
        amount: new Prisma.Decimal(amount),
        discount: new Prisma.Decimal(0),
        tax: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(amount),
        paidAmount: new Prisma.Decimal(0),
        dueDate: new Date(today.getFullYear(), today.getMonth(), 10),
        status: player.status === 'paid' ? 'paid' : player.status === 'overdue' ? 'overdue' : 'pending',
      },
    });
    if (player.status === 'paid') {
      await prisma.$executeRaw`UPDATE fee_invoices SET paid_amount = total_amount, status = 'paid' WHERE id = ${fee.id}`;
      await prisma.payment.create({
        data: {
          receiptNumber: `RCP-${currentMonth}-${String(6000 + player.id)}`,
          regularPlayerId: player.id,
          feeInvoiceId: fee.id,
          category: 'regular_membership',
          description: `Monthly membership for ${currentMonth}`,
          amount: new Prisma.Decimal(amount),
          discount: new Prisma.Decimal(0),
          tax: new Prisma.Decimal(0),
          finalAmount: new Prisma.Decimal(amount),
          paymentDate: new Date(),
          paymentMethod: player.id % 2 === 0 ? 'upi' : 'cash',
          status: 'paid',
          collectedBy: manager.id,
        },
      });
    }
  }
  console.log('  Fee invoices and payments created');

  // ============ SUBSCRIPTIONS ============
  for (const player of players) {
    await prisma.subscription.create({
      data: {
        regularPlayerId: player.id,
        type: 'regular',
        startDate: player.subscriptionStart as Date,
        endDate: (player.subscriptionEnd as Date) || new Date(),
        amount: player.monthlyFee,
        discount: new Prisma.Decimal(0),
        billingCycle: 'monthly',
        paymentStatus: player.status === 'expired' ? 'expired' : 'active',
      },
    });
  }
  for (const student of students.slice(0, 10)) {
    const end = new Date();
    end.setMonth(end.getMonth() + 3);
    await prisma.subscription.create({
      data: {
        studentId: student.id,
        type: 'coaching',
        startDate: new Date(),
        endDate: end,
        amount: student.monthlyFee,
        discount: student.discount,
        billingCycle: 'quarterly',
        paymentStatus: 'active',
      },
    });
  }
  console.log('  Subscriptions created');

  // ============ EXPENSES ============
  const expenseCategories = ['Rent', 'Electricity', 'Coaching expenses', 'Shuttlecock purchases', 'Equipment purchases', 'Maintenance', 'Marketing'];
  const expenseDescriptions = ['Monthly court hall rent', 'Electricity bill - March', 'Coach salary - quarter', 'Yonex Aerosensa shuttlecocks', 'New net and posts', 'Court surface maintenance', 'Social media ads campaign'];
  for (let i = 0; i < 7; i++) {
    const expDate = new Date(today.getFullYear(), today.getMonth(), Math.floor(1 + Math.random() * 27));
    await prisma.expense.create({
      data: {
        category: expenseCategories[i],
        description: expenseDescriptions[i],
        amount: new Prisma.Decimal(3000 + i * 1500),
        date: expDate,
        paymentMethod: i % 2 === 0 ? 'bank_transfer' : 'cash',
        vendor: i % 3 === 0 ? 'SportsMart India' : undefined,
        addedBy: superAdmin.id,
      },
    });
  }
  console.log('  Expenses created: 7');

  // ============ PRODUCTS ============
  const productDefs = [
    { name: 'Yonex Aerosensa 50 Shuttlecock', sku: 'SKU-SHUT01', category: 'Shuttlecocks', brand: 'Yonex', purchase: 350, selling: 480, stock: 40, threshold: 10 },
    { name: 'Yonex Arcsaber 7 Racket', sku: 'SKU-RKT01', category: 'Rackets', brand: 'Yonex', purchase: 5500, selling: 6500, stock: 8, threshold: 3 },
    { name: 'Li-Ning Grip Tape', sku: 'SKU-GRP01', category: 'Grips', brand: 'Li-Ning', purchase: 45, selling: 80, stock: 100, threshold: 20 },
    { name: 'ProShuttle Smash Racket', sku: 'SKU-RKT02', category: 'Rackets', brand: 'ProShuttle', purchase: 2800, selling: 3500, stock: 3, threshold: 4 },
    { name: 'Academy T-Shirt', sku: 'SKU-APP01', category: 'Sportswear', brand: 'Academy', purchase: 250, selling: 450, stock: 25, threshold: 10 },
    { name: 'Badminton Shoes (Puma)', sku: 'SKU-SHO01', category: 'Footwear', brand: 'Puma', purchase: 4200, selling: 5200, stock: 5, threshold: 5 },
  ];
  for (const p of productDefs) {
    await prisma.product.create({
      data: {
        name: p.name,
        sku: p.sku,
        category: p.category,
        brand: p.brand,
        purchasePrice: new Prisma.Decimal(p.purchase),
        sellingPrice: new Prisma.Decimal(p.selling),
        stockQuantity: p.stock,
        lowStockThreshold: p.threshold,
        status: 'active',
      },
    });
  }
  console.log('  Products created:', productDefs.length);

  // ============ TOURNAMENTS ============
  const t1Start = new Date(today.getFullYear(), today.getMonth() + 1, 15);
  const t1End = new Date(today.getFullYear(), today.getMonth() + 1, 17);
  const t1Deadline = new Date(today.getFullYear(), today.getMonth() + 1, 10);
  const formatDateISO = (d: Date) => d.toISOString();
  const tourn1 = await prisma.tournament.create({
    data: {
      name: 'SmashZone Open Championship 2025',
      description: 'Open badminton championship with categories for juniors and senior players. Winners get cash prizes and free coaching month.',
      startDate: t1Start,
      endDate: t1End,
      registrationDeadline: t1Deadline,
      venue: 'SmashZone Badminton Academy, Main Hall',
      categories: JSON.stringify(['Singles', 'Doubles', 'Mixed Doubles', 'Under-15', 'Open']),
      entryFee: new Prisma.Decimal(500),
      prizeDetails: 'Winner: ₹25,000 + Trophy | Runner-up: ₹10,000 | Semifinalists: ₹2,000',
      rules: 'Standard BWF rules apply. Players must report 30 minutes before match time.',
      contactDetails: '+91 98765 43210',
      status: 'registration_open',
      isFeatured: true,
    },
  });
  await prisma.tournament.create({
    data: {
      name: 'Junior Talent Hunt 2025',
      description: 'Scouting tournament for young talent under 15. Selected players get academy scholarships.',
      startDate: new Date(today.getFullYear(), today.getMonth() + 2, 5),
      endDate: new Date(today.getFullYear(), today.getMonth() + 2, 6),
      registrationDeadline: new Date(today.getFullYear(), today.getMonth() + 2, 1),
      venue: 'SmashZone Badminton Academy',
      categories: JSON.stringify(['Under-11', 'Under-13', 'Under-15']),
      entryFee: new Prisma.Decimal(300),
      prizeDetails: 'Gold/Silver/Bronze medals + 1 month free coaching for top 3 in each category',
      status: 'published',
      isFeatured: false,
    },
  });

  // Tournament registrations
  for (let i = 0; i < 8; i++) {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tourn1.id,
        participantName: `${['Arjun', 'Sara', 'Vivaan', 'Diya', 'Advik', 'Ananya', 'Reyansh', 'Ishita'][i]} ${['Nair', 'Khan', 'Gupta', 'Shah', 'Kulkarni', 'Iyer', 'Mehta', 'Das'][i]}`,
        phone: '96' + String(Math.floor(1000000000 + Math.random() * 8999999999)),
        email: `player${i + 1}@example.com`,
        category: ['Singles', 'Doubles', 'Mixed Doubles', 'Under-15'][i % 4],
        amount: new Prisma.Decimal(500),
        paymentStatus: 'paid',
      },
    });
  }
  console.log('  Tournaments created: 2');

  // ============ WEBSITE CONTENT ============
  await prisma.heroSlide.create({
    data: {
      title: 'Welcome to SmashZone Badminton Academy',
      subtitle: 'Professional coaching, world-class courts and a community that loves badminton.',
      image: '/images/hero1.png',
      ctaText: 'Join Our Academy',
      ctaLink: '#coaching',
      sortOrder: 1,
      isActive: true,
    },
  });
  await prisma.heroSlide.create({
    data: {
      title: 'Train Like a Champion',
      subtitle: 'Structured programs for beginners, intermediates and advanced players of all ages.',
      image: '/images/hero2.png',
      ctaText: 'Explore Batches',
      ctaLink: '#batches',
      sortOrder: 2,
      isActive: true,
    },
  });

  const programDefs = [
    { title: 'Kids Coaching', desc: 'Fun, age-appropriate coaching that builds fundamentals, coordination and a love for the game.', ageGroup: '6-10 yrs', skillLevel: 'Beginner', fee: '₹1,500/mo', image: '/images/kc.png' },
    { title: 'Beginners Program', desc: 'Learn the basics - grips, footwork, serve and rallying in a supportive group environment.', ageGroup: 'Adults & Juniors', skillLevel: 'Beginner', fee: '₹2,000/mo', image: '/images/bp.png' },
    { title: 'Intermediate Coaching', desc: 'Sharpen your technique, tactics and match play with structured drills and supervised sparring.', ageGroup: '14+ yrs', skillLevel: 'Intermediate', fee: '₹2,500/mo', image: '/images/ic.png' },
    { title: 'Advanced Training', desc: 'Intensive on-court training, video analysis and strength conditioning for competitive players.', ageGroup: 'Open', skillLevel: 'Advanced', fee: '₹4,000/mo', image: '/images/at.png' },
    { title: 'Professional Training', desc: 'Elite-level program with personalized periodization, physio support and tournament coaching.', ageGroup: 'Open', skillLevel: 'Professional', fee: '₹6,000/mo', image: '/images/pt.png' },
    { title: 'Fitness & Agility', desc: 'Sport-specific fitness, agility drills, plyometrics and injury prevention for players.', ageGroup: 'Open', skillLevel: 'All levels', fee: '₹1,500/mo', image: '/images/fa.png' },
  ];
  for (const p of programDefs) {
    await prisma.coachingProgram.create({
      data: {
        title: p.title,
        description: p.desc,
        image: p.image,
        ageGroup: p.ageGroup,
        skillLevel: p.skillLevel,
        feeDisplay: p.fee,
        sortOrder: programDefs.indexOf(p) + 1,
        isActive: true,
      },
    });
  }
  console.log('  Website content (hero + programs) created');

  const facilityDefs = [
    { title: 'Professional Courts', desc: '4 international standard synthetic courts' },
    { title: 'Premium Lighting', desc: 'Zero-glare LED lighting for perfect visibility' },
    { title: 'Changing Rooms', desc: 'Clean, spacious changing rooms with lockers' },
    { title: 'Drinking Water', desc: 'RO purified water stations throughout' },
    { title: 'Ample Parking', desc: 'Free car and bike parking for players' },
    { title: 'Pro Shop & Stringing', desc: 'Rackets, shuttles, and expert stringing service' },
    { title: 'Seating Gallery', desc: 'Spectator seating with a full view of play' },
    { title: 'Fitness Corner', desc: 'Strength and conditioning equipment' },
  ];
  for (let i = 0; i < facilityDefs.length; i++) {
    await prisma.facility.create({
      data: {
        title: facilityDefs[i].title,
        description: facilityDefs[i].desc,
        sortOrder: i + 1,
        isActive: true,
      },
    });
  }
  console.log('  Facilities created:', facilityDefs.length);

  const testimonials = [
    { name: 'Rahul Verma', text: 'My daughter joined the kids program a year ago and her transformation is amazing. The coaches are patient and truly care about each child.', rating: 5 },
    { name: 'Sneha Kulkarni', text: 'Best badminton academy in the city. The regular play membership fits perfectly into my schedule. Courts are always well maintained.', rating: 5 },
    { name: 'Faizan Ahmed', text: 'I went from casual player to district level competitor thanks to the advanced training program. Highly recommended!', rating: 4 },
    { name: 'Lakshmi Iyer', text: 'Great facilities and friendly staff. The bulk court booking through the app saves so much time.', rating: 5 },
  ];
  for (const t of testimonials) {
    await prisma.testimonial.create({
      data: {
        name: t.name,
        testimonial: t.text,
        rating: t.rating,
        isPublished: true,
      },
    });
  }
  console.log('  Testimonials created:', testimonials.length);

  // ============ NOTIFICATIONS ============
  await prisma.notification.create({
    data: {
      type: 'fee_due',
      title: 'Fees due today',
      message: `${students.length} coaching students have fees due today. Please collect payments.`,
      isRead: false,
    },
  });
  await prisma.notification.create({
    data: {
      type: 'fee_overdue',
      title: 'Overdue subscriptions',
      message: `${players.filter((p) => p.status === 'overdue').length} regular players have overdue monthly subscriptions.`,
      isRead: false,
    },
  });
  await prisma.notification.create({
    data: {
      type: 'subscription_expiry',
      title: 'Memberships expiring soon',
      message: 'Several memberships expire within 7 days. Send renewal reminders.',
      isRead: false,
    },
  });
  await prisma.notification.create({
    data: {
      type: 'low_stock',
      title: 'Low stock alert',
      message: 'ProShuttle Smash Racket stock is below threshold. Consider restocking.',
      isRead: false,
    },
  });
  console.log('  Notifications created');

  console.log('====================================');
  console.log('Seeding complete!');
  console.log('Default logins:');
  console.log('  Super Admin: superadmin@academy.com / ChangeMe@123');
  console.log('  Manager:     manager@academy.com / ChangeMe@123');
  console.log('  Staff:       staff@academy.com / ChangeMe@123');
  console.log('Please change these passwords after first login.');
  console.log('====================================');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });