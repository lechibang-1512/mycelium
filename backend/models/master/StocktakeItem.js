const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const StocktakeItem = sequelizeMaster.define('StocktakeItem', {
            product_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            bin_location: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            system_quantity: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                defaultValue: '0.00',
            },
            counted_quantity: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            variance: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            variance_pct: {
                type: DataTypes.DECIMAL,
                allowNull: true,
                
                
                
            },
            adjustment_applied: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                
            },
            adjustment_receipt_id: {
                type: DataTypes.STRING(50),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
                
                
                
            },
            counted_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            counted_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            stocktake_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
            id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
        primaryKey: true,
                
                
                
            },
}, {
    tableName: 'stocktake_items',
    timestamps: false
});

module.exports = StocktakeItem;
