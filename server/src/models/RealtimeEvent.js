import { DataTypes, Model } from 'sequelize';

class RealtimeEvent extends Model {
    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                type: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                branchId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    comment: 'null means global event (all branches)',
                },
                payload: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                },
            },
            {
                sequelize,
                modelName: 'RealtimeEvent',
                tableName: 'realtime_events',
                updatedAt: false,
            }
        );
    }
}

export default RealtimeEvent;
