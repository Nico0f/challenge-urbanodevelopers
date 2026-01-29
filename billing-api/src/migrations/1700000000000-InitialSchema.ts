import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const serviceStatusEnumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'service_status_enum'
      )
    `);
    
    if (!serviceStatusEnumExists[0].exists) {
      await queryRunner.query(`
        CREATE TYPE "service_status_enum" AS ENUM('CREATED', 'SENT_TO_BILL', 'INVOICED')
      `);
    }

    const servicesTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'services'
      )
    `);

    if (!servicesTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "services" (
          "id" SERIAL NOT NULL,
          "serviceDate" DATE NOT NULL,
          "customerId" INTEGER NOT NULL,
          "amount" DECIMAL(10,2) NOT NULL,
          "status" "service_status_enum" NOT NULL DEFAULT 'CREATED',
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_services" PRIMARY KEY ("id")
        )
      `);
    }

    const pendingStatusEnumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'pending_status_enum'
      )
    `);
    
    if (!pendingStatusEnumExists[0].exists) {
      await queryRunner.query(`
        CREATE TYPE "pending_status_enum" AS ENUM('PENDING', 'INVOICED')
      `);
    }

    const pendingsTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'billing_pendings'
      )
    `);

    if (!pendingsTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "billing_pendings" (
          "id" SERIAL NOT NULL,
          "serviceId" INTEGER NOT NULL,
          "status" "pending_status_enum" NOT NULL DEFAULT 'PENDING',
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_billing_pendings" PRIMARY KEY ("id")
        )
      `);
    }

    const batchStatusEnumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'batch_status_enum'
      )
    `);
    
    if (!batchStatusEnumExists[0].exists) {
      await queryRunner.query(`
        CREATE TYPE "batch_status_enum" AS ENUM('PROCESSED', 'ERROR')
      `);
    }

    const batchesTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'billing_batches'
      )
    `);

    if (!batchesTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "billing_batches" (
          "id" SERIAL NOT NULL,
          "issueDate" DATE NOT NULL,
          "receiptBook" VARCHAR NOT NULL,
          "status" "batch_status_enum" NOT NULL DEFAULT 'PROCESSED',
          "errorMessage" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_billing_batches" PRIMARY KEY ("id")
        )
      `);
    }

    const invoicesTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'invoices'
      )
    `);

    if (!invoicesTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "invoices" (
          "id" SERIAL NOT NULL,
          "invoiceNumber" VARCHAR NOT NULL,
          "cae" VARCHAR NOT NULL,
          "issueDate" DATE NOT NULL,
          "amount" DECIMAL(10,2) NOT NULL,
          "batchId" INTEGER NOT NULL,
          "pendingId" INTEGER NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_invoices" PRIMARY KEY ("id")
        )
      `);
    }

    const fkPendingsServiceExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_billing_pendings_serviceId'
      )
    `);

    if (!fkPendingsServiceExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "billing_pendings"
        ADD CONSTRAINT "FK_billing_pendings_serviceId"
        FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }

    const fkInvoicesBatchExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_invoices_batchId'
      )
    `);

    if (!fkInvoicesBatchExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "invoices"
        ADD CONSTRAINT "FK_invoices_batchId"
        FOREIGN KEY ("batchId") REFERENCES "billing_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }

    const fkInvoicesPendingExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_invoices_pendingId'
      )
    `);

    if (!fkInvoicesPendingExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "invoices"
        ADD CONSTRAINT "FK_invoices_pendingId"
        FOREIGN KEY ("pendingId") REFERENCES "billing_pendings"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_pendingId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_batchId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_pendings" DROP CONSTRAINT "FK_billing_pendings_serviceId"`,
    );

    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TABLE "billing_batches"`);
    await queryRunner.query(`DROP TABLE "billing_pendings"`);
    await queryRunner.query(`DROP TABLE "services"`);

    await queryRunner.query(`DROP TYPE "batch_status_enum"`);
    await queryRunner.query(`DROP TYPE "pending_status_enum"`);
    await queryRunner.query(`DROP TYPE "service_status_enum"`);
  }
}

