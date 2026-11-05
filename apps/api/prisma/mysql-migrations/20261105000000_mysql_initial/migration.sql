-- CreateTable
CREATE TABLE `User` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(180) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'OPERATOR') NOT NULL DEFAULT 'OPERATOR',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Category` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(500) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Product` (
    `id` CHAR(36) NOT NULL,
    `sku` VARCHAR(80) NOT NULL,
    `barcode` VARCHAR(80) NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `categoryId` CHAR(36) NOT NULL,
    `unit` ENUM('UNIT', 'BOX', 'PACK', 'KG', 'G', 'LITER', 'ML', 'METER') NOT NULL DEFAULT 'UNIT',
    `imageUrl` VARCHAR(2048) NULL,
    `costPrice` DECIMAL(18, 2) NULL,
    `salePrice` DECIMAL(18, 2) NULL,
    `stock` DECIMAL(18, 3) NOT NULL DEFAULT 0,
    `minimumStock` DECIMAL(18, 3) NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_sku_key`(`sku`),
    UNIQUE INDEX `Product_barcode_key`(`barcode`),
    INDEX `Product_name_idx`(`name`),
    INDEX `Product_categoryId_active_idx`(`categoryId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Customer` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_code_key`(`code`),
    INDEX `Customer_name_active_idx`(`name`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `type` ENUM('ENTRY', 'EXIT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT') NOT NULL,
    `quantity` DECIMAL(18, 3) NOT NULL,
    `previousStock` DECIMAL(18, 3) NOT NULL,
    `resultingStock` DECIMAL(18, 3) NOT NULL,
    `reason` ENUM('INITIAL_STOCK', 'PURCHASE', 'SALE', 'INTERNAL_USE', 'RETURN', 'LOSS', 'INVENTORY_ADJUSTMENT', 'OTHER') NOT NULL,
    `reference` VARCHAR(120) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `customerId` CHAR(36) NULL,
    `buyerIdentification` ENUM('IDENTIFIED', 'ANONYMOUS') NULL,
    `customerNameSnapshot` VARCHAR(120) NULL,
    `customerCodeSnapshot` VARCHAR(40) NULL,
    `requestId` CHAR(36) NULL,
    `requestHash` VARCHAR(64) NULL,

    INDEX `StockMovement_customerId_createdAt_idx`(`customerId`, `createdAt`),
    INDEX `StockMovement_productId_createdAt_idx`(`productId`, `createdAt`),
    INDEX `StockMovement_userId_createdAt_idx`(`userId`, `createdAt`),
    UNIQUE INDEX `StockMovement_userId_requestId_key`(`userId`, `requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `ProductImage` (
    `id` CHAR(36) NOT NULL,
    `ownerId` CHAR(36) NOT NULL,
    `publicId` VARCHAR(200) NOT NULL,
    `url` VARCHAR(2048) NULL,
    `state` ENUM('PENDING', 'READY', 'DELETING', 'DELETED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,

    UNIQUE INDEX `ProductImage_publicId_key`(`publicId`),
    INDEX `ProductImage_state_expiresAt_idx`(`state`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `tradeName` VARCHAR(200) NULL,
    `document` VARCHAR(14) NULL,
    `email` VARCHAR(180) NULL,
    `phone` VARCHAR(40) NULL,
    `contact` VARCHAR(120) NULL,
    `address` VARCHAR(1000) NULL,
    `notes` VARCHAR(5000) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Supplier_document_key`(`document`),
    INDEX `Supplier_name_id_idx`(`name`, `id`),
    INDEX `Supplier_active_name_idx`(`active`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `PurchaseOrder` (
    `id` CHAR(36) NOT NULL,
    `number` INTEGER NOT NULL AUTO_INCREMENT,
    `supplierId` CHAR(36) NOT NULL,
    `supplierName` VARCHAR(200) NOT NULL,
    `supplierDocument` VARCHAR(14) NULL,
    `createdBy` CHAR(36) NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `revision` INTEGER NOT NULL DEFAULT 1,
    `notes` VARCHAR(5000) NULL,
    `total` DECIMAL(18, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `sentAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,

    UNIQUE INDEX `PurchaseOrder_number_key`(`number`),
    INDEX `PurchaseOrder_supplierId_createdAt_idx`(`supplierId`, `createdAt`),
    INDEX `PurchaseOrder_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `PurchaseOrderItem` (
    `id` CHAR(36) NOT NULL,
    `orderId` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `productName` VARCHAR(200) NOT NULL,
    `sku` VARCHAR(80) NOT NULL,
    `unit` ENUM('UNIT', 'BOX', 'PACK', 'KG', 'G', 'LITER', 'ML', 'METER') NOT NULL,
    `quantity` DECIMAL(18, 3) NOT NULL,
    `received` DECIMAL(18, 3) NOT NULL DEFAULT 0,
    `unitCost` DECIMAL(18, 2) NOT NULL,
    `total` DECIMAL(18, 2) NOT NULL,

    UNIQUE INDEX `PurchaseOrderItem_orderId_productId_key`(`orderId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `PurchaseReceipt` (
    `id` CHAR(36) NOT NULL,
    `orderId` CHAR(36) NOT NULL,
    `createdBy` CHAR(36) NOT NULL,
    `requestHash` VARCHAR(64) NOT NULL,
    `notes` VARCHAR(5000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PurchaseReceipt_orderId_createdAt_idx`(`orderId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `PurchaseReceiptItem` (
    `id` CHAR(36) NOT NULL,
    `receiptId` CHAR(36) NOT NULL,
    `orderItemId` CHAR(36) NOT NULL,
    `quantity` DECIMAL(18, 3) NOT NULL,
    `movementId` CHAR(36) NOT NULL,

    UNIQUE INDEX `PurchaseReceiptItem_movementId_key`(`movementId`),
    UNIQUE INDEX `PurchaseReceiptItem_receiptId_orderItemId_key`(`receiptId`, `orderItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `ImportJob` (
    `id` CHAR(36) NOT NULL,
    `status` ENUM('PREVIEW', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PREVIEW',
    `createdBy` CHAR(36) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `format` VARCHAR(4) NOT NULL,
    `delimiter` VARCHAR(1) NULL,
    `headers` JSON NOT NULL,
    `rows` JSON NOT NULL,
    `mapping` JSON NOT NULL,
    `categoryMappings` JSON NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 1,
    `totalRows` INTEGER NOT NULL,
    `ignoredRows` INTEGER NOT NULL DEFAULT 0,
    `importedRows` INTEGER NOT NULL DEFAULT 0,
    `result` JSON NULL,
    `error` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ImportJob_createdBy_createdAt_idx`(`createdBy`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `PhysicalInventory` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `status` ENUM('DRAFT', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `revision` INTEGER NOT NULL DEFAULT 1,
    `categoryId` CHAR(36) NULL,
    `categoryName` VARCHAR(120) NULL,
    `createdById` CHAR(36) NOT NULL,
    `completedById` CHAR(36) NULL,
    `cancelledById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancellationNotes` VARCHAR(1000) NULL,
    `adjustmentCount` INTEGER NOT NULL DEFAULT 0,

    INDEX `PhysicalInventory_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `PhysicalInventory_createdById_createdAt_idx`(`createdById`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `PhysicalInventoryItem` (
    `inventoryId` CHAR(36) NOT NULL,
    `productId` CHAR(36) NOT NULL,
    `sku` VARCHAR(80) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `unit` ENUM('UNIT', 'BOX', 'PACK', 'KG', 'G', 'LITER', 'ML', 'METER') NOT NULL,
    `snapshotStock` DECIMAL(18, 3) NOT NULL,
    `snapshotUpdatedAt` DATETIME(3) NOT NULL,
    `snapshotMovementCount` INTEGER NOT NULL,
    `countedQuantity` DECIMAL(18, 3) NULL,
    `notes` VARCHAR(1000) NULL,
    `countedById` CHAR(36) NULL,
    `countedAt` DATETIME(3) NULL,

    INDEX `PhysicalInventoryItem_productId_idx`(`productId`),
    PRIMARY KEY (`inventoryId`, `productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `OperationLock` (
    `key` VARCHAR(120) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- NO PAD binary collations preserve case, accents and trailing spaces.
SET @gav_collation = IF(LOCATE('MariaDB', VERSION()) > 0, 'utf8mb4_nopad_bin', 'utf8mb4_0900_bin');
SET @gav_sql = CONCAT('ALTER TABLE `User` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `Category` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `Product` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `Customer` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `StockMovement` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `ProductImage` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `Supplier` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `PurchaseOrder` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `PurchaseOrderItem` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `PurchaseReceipt` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `PurchaseReceiptItem` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `ImportJob` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `PhysicalInventory` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `PhysicalInventoryItem` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;
SET @gav_sql = CONCAT('ALTER TABLE `OperationLock` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @gav_collation);
PREPARE gav_stmt FROM @gav_sql;
EXECUTE gav_stmt;
DEALLOCATE PREPARE gav_stmt;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PurchaseReceipt` ADD CONSTRAINT `PurchaseReceipt_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PurchaseReceipt` ADD CONSTRAINT `PurchaseReceipt_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PurchaseReceiptItem` ADD CONSTRAINT `PurchaseReceiptItem_receiptId_fkey` FOREIGN KEY (`receiptId`) REFERENCES `PurchaseReceipt`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PurchaseReceiptItem` ADD CONSTRAINT `PurchaseReceiptItem_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `PurchaseOrderItem`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PurchaseReceiptItem` ADD CONSTRAINT `PurchaseReceiptItem_movementId_fkey` FOREIGN KEY (`movementId`) REFERENCES `StockMovement`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ImportJob` ADD CONSTRAINT `ImportJob_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PhysicalInventory` ADD CONSTRAINT `PhysicalInventory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PhysicalInventory` ADD CONSTRAINT `PhysicalInventory_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PhysicalInventory` ADD CONSTRAINT `PhysicalInventory_completedById_fkey` FOREIGN KEY (`completedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PhysicalInventory` ADD CONSTRAINT `PhysicalInventory_cancelledById_fkey` FOREIGN KEY (`cancelledById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PhysicalInventoryItem` ADD CONSTRAINT `PhysicalInventoryItem_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `PhysicalInventory`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PhysicalInventoryItem` ADD CONSTRAINT `PhysicalInventoryItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PhysicalInventoryItem` ADD CONSTRAINT `PhysicalInventoryItem_countedById_fkey` FOREIGN KEY (`countedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;


ALTER TABLE `ProductImage` ADD COLUMN `urlDigest` BINARY(32) GENERATED ALWAYS AS (UNHEX(SHA2(`url`,256))) STORED,
  ADD UNIQUE KEY `ProductImage_url_key` (`urlDigest`);
ALTER TABLE `Product` ADD COLUMN `skuFold` VARBINARY(320) GENERATED ALWAYS AS (CONVERT(LOWER(`sku`) USING binary)) STORED,
  ADD UNIQUE KEY `Product_sku_lower_key` (`skuFold`);

ALTER TABLE `Product` ADD CONSTRAINT `Product_stock_nonnegative` CHECK (`stock` >= 0);
ALTER TABLE `Product` ADD CONSTRAINT `Product_minimumStock_nonnegative` CHECK (`minimumStock` >= 0);
ALTER TABLE `Product` ADD CONSTRAINT `Product_costPrice_nonnegative` CHECK (`costPrice` >= 0);
ALTER TABLE `Product` ADD CONSTRAINT `Product_salePrice_nonnegative` CHECK (`salePrice` >= 0);
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_quantity_positive` CHECK (`quantity` > 0);
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_previousStock_nonnegative` CHECK (`previousStock` >= 0);
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_resultingStock_nonnegative` CHECK (`resultingStock` >= 0);
ALTER TABLE `ImportJob` ADD CONSTRAINT `ImportJob_counts_check` CHECK (`totalRows` BETWEEN 1 AND 2000 AND `importedRows` BETWEEN 0 AND `totalRows` AND `ignoredRows` >= 0 AND `revision` > 0);
ALTER TABLE `PhysicalInventory` ADD CONSTRAINT `PhysicalInventory_revision_check` CHECK (`revision` > 0);
ALTER TABLE `PhysicalInventory` ADD CONSTRAINT `PhysicalInventory_adjustments_check` CHECK (`adjustmentCount` BETWEEN 0 AND 500);
ALTER TABLE `PhysicalInventory` ADD CONSTRAINT `PhysicalInventory_title_check` CHECK (length(trim(`title`)) > 0);
ALTER TABLE `PhysicalInventory` ADD CONSTRAINT `PhysicalInventory_status_check` CHECK (
    (`status` = 'DRAFT' AND `completedAt` IS NULL AND `completedById` IS NULL AND `cancelledAt` IS NULL AND `cancelledById` IS NULL AND `adjustmentCount` = 0)
    OR (`status` = 'COMPLETED' AND `completedAt` IS NOT NULL AND `completedById` IS NOT NULL AND `cancelledAt` IS NULL AND `cancelledById` IS NULL)
    OR (`status` = 'CANCELLED' AND `cancelledAt` IS NOT NULL AND `cancelledById` IS NOT NULL AND `completedAt` IS NULL AND `completedById` IS NULL AND `adjustmentCount` = 0)
  );
ALTER TABLE `PhysicalInventoryItem` ADD CONSTRAINT `PhysicalInventoryItem_quantity_check` CHECK (`snapshotStock` >= 0 AND (`countedQuantity` IS NULL OR `countedQuantity` >= 0) AND `snapshotMovementCount` >= 0);
ALTER TABLE `PhysicalInventoryItem` ADD CONSTRAINT `PhysicalInventoryItem_count_author_check` CHECK (
    (`countedQuantity` IS NULL AND `countedById` IS NULL AND `countedAt` IS NULL)
    OR (`countedQuantity` IS NOT NULL AND `countedById` IS NOT NULL AND `countedAt` IS NOT NULL)
  );
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_total_check` CHECK (`total` >= 0), ADD CONSTRAINT `PurchaseOrder_revision_check` CHECK (`revision` > 0);
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_balance_check` CHECK (`quantity` > 0 AND `received` >= 0 AND `received` <= `quantity`), ADD CONSTRAINT `PurchaseOrderItem_cost_check` CHECK (`unitCost` >= 0 AND `total` >= 0);
ALTER TABLE `PurchaseReceiptItem` ADD CONSTRAINT `PurchaseReceiptItem_quantity_check` CHECK (`quantity` > 0);
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_buyer_consistency` CHECK (
  (`buyerIdentification` IS NULL AND `customerId` IS NULL AND `customerNameSnapshot` IS NULL AND `customerCodeSnapshot` IS NULL)
  OR (`buyerIdentification` IS NOT NULL AND `type` = 'EXIT' AND `reason` = 'SALE' AND (
    (`buyerIdentification` = 'ANONYMOUS' AND `customerId` IS NULL AND `customerNameSnapshot` IS NULL AND `customerCodeSnapshot` IS NULL)
    OR (`buyerIdentification` = 'IDENTIFIED' AND `customerId` IS NOT NULL AND `customerNameSnapshot` IS NOT NULL AND `customerCodeSnapshot` IS NOT NULL)
  ))
);
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_request_consistency` CHECK ((`requestId` IS NULL) = (`requestHash` IS NULL));
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_name_nonempty` CHECK (length(trim(`name`)) > 0);
ALTER TABLE `User` DROP INDEX `User_email_key`, ADD COLUMN `emailExact` VARBINARY(800) GENERATED ALWAYS AS (CONVERT(`email` USING binary)) STORED, ADD UNIQUE KEY `User_email_key` (`emailExact`);
ALTER TABLE `Category` DROP INDEX `Category_name_key`, ADD COLUMN `nameExact` VARBINARY(800) GENERATED ALWAYS AS (CONVERT(`name` USING binary)) STORED, ADD UNIQUE KEY `Category_name_key` (`nameExact`);
ALTER TABLE `Product` DROP INDEX `Product_sku_key`, ADD COLUMN `skuExact` VARBINARY(800) GENERATED ALWAYS AS (CONVERT(`sku` USING binary)) STORED, ADD UNIQUE KEY `Product_sku_key` (`skuExact`);
ALTER TABLE `Product` DROP INDEX `Product_barcode_key`, ADD COLUMN `barcodeExact` VARBINARY(800) GENERATED ALWAYS AS (CONVERT(`barcode` USING binary)) STORED, ADD UNIQUE KEY `Product_barcode_key` (`barcodeExact`);
ALTER TABLE `Customer` DROP INDEX `Customer_code_key`, ADD COLUMN `codeExact` VARBINARY(800) GENERATED ALWAYS AS (CONVERT(`code` USING binary)) STORED, ADD UNIQUE KEY `Customer_code_key` (`codeExact`);
ALTER TABLE `ProductImage` DROP INDEX `ProductImage_publicId_key`, ADD COLUMN `publicIdExact` VARBINARY(2048) GENERATED ALWAYS AS (CONVERT(`publicId` USING binary)) STORED, ADD UNIQUE KEY `ProductImage_publicId_key` (`publicIdExact`);
ALTER TABLE `Supplier` DROP INDEX `Supplier_document_key`, ADD COLUMN `documentExact` VARBINARY(800) GENERATED ALWAYS AS (CONVERT(`document` USING binary)) STORED, ADD UNIQUE KEY `Supplier_document_key` (`documentExact`);
