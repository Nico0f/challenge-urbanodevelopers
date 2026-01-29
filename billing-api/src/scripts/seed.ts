import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'billing_challenge',
  synchronize: false,
  logging: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('Database connection established');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Clear existing data
    await queryRunner.query('DELETE FROM invoices');
    await queryRunner.query('DELETE FROM billing_batches');
    await queryRunner.query('DELETE FROM billing_pendings');
    await queryRunner.query('DELETE FROM services');

    console.log('Cleared existing data');

    // Create sample services
    const services = [
      // Customer 1 - Multiple services
      { serviceDate: '2024-01-05', customerId: 1, amount: 1500.00 },
      { serviceDate: '2024-01-10', customerId: 1, amount: 2300.50 },
      { serviceDate: '2024-01-15', customerId: 1, amount: 850.00 },
      { serviceDate: '2024-01-20', customerId: 1, amount: 3200.75 },
      
      // Customer 2 - Multiple services
      { serviceDate: '2024-01-08', customerId: 2, amount: 4500.00 },
      { serviceDate: '2024-01-12', customerId: 2, amount: 1200.00 },
      { serviceDate: '2024-01-18', customerId: 2, amount: 2800.25 },
      
      // Customer 3 - Some services
      { serviceDate: '2024-01-06', customerId: 3, amount: 950.00 },
      { serviceDate: '2024-01-14', customerId: 3, amount: 1750.50 },
      
      // Customer 4 - Single service
      { serviceDate: '2024-01-22', customerId: 4, amount: 5000.00 },
      
      // Customer 5 - Multiple services
      { serviceDate: '2024-01-03', customerId: 5, amount: 600.00 },
      { serviceDate: '2024-01-09', customerId: 5, amount: 1100.00 },
      { serviceDate: '2024-01-16', customerId: 5, amount: 2200.00 },
      { serviceDate: '2024-01-25', customerId: 5, amount: 3300.00 },
    ];

    for (const service of services) {
      await queryRunner.query(
        `INSERT INTO services ("serviceDate", "customerId", "amount", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'CREATED', NOW(), NOW())`,
        [service.serviceDate, service.customerId, service.amount],
      );
    }

    console.log(`Created ${services.length} sample services`);

    await queryRunner.commitTransaction();
    console.log('Seeding completed successfully!');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
