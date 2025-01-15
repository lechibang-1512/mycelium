const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const StocktakeStatusHistory = sequelizeMaster.define('StocktakeStatusHistory', {
            old_status: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            new_status: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                
            },
            changed_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            changed_at: {
                type: DataTypes.DATE,
                allowNull: true,
                
                
                
            },
            notes: {
                type: DataTypes.TEXT,
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
    tableName: 'stocktake_status_history',
    timestamps: false
});

module.exports = StocktakeStatusHistory;
