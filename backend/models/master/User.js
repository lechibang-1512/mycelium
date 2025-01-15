const { DataTypes } = require('sequelize');
const { sequelizeMaster } = require('../../config/sequelize');

const User = sequelizeMaster.define('User', {
            username: {
                type: DataTypes.STRING(100),
                allowNull: true,
                
                
                
            },
            password: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            full_name: {
                type: DataTypes.STRING(255),
                allowNull: true,
                
                
                
            },
            role: {
                type: DataTypes.STRING(50),
                allowNull: true,
                
                
                defaultValue: 'user',
            },
            is_active: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                defaultValue: 1,
            },
            is_locked: {
                type: DataTypes.TINYINT,
                allowNull: true,
                
                
                
            },
            failed_login_attempts: {
                type: DataTypes.INTEGER,
                allowNull: true,
                
                
                
            },
            last_login: {
                type: DataTypes.DATE,
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
            user_id: {
                type: DataTypes.CHAR(36),
                allowNull: true,
                
                
                
            },
}, {
    tableName: 'users',
    timestamps: false
});

module.exports = User;
