'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Update all branches to use 'KSh' as currencySymbol
        await queryInterface.sequelize.query(`
            UPDATE branches 
            SET "currencySymbol" = 'KSh' 
            WHERE "currencySymbol" IS NOT NULL;
        `);

        // Alternative: Update specific cases only
        // await queryInterface.sequelize.query(`
        //     UPDATE branches 
        //     SET "currencySymbol" = 'KSh' 
        //     WHERE "currencySymbol" IN ('KES', '$', '€', '£', '')
        //     OR "currencySymbol" IS NULL;
        // `);
    },

    down: async (queryInterface, Sequelize) => {
        // Revert back to 'KES' for Kenyan branches
        // This assumes all branches were using 'KES' before
        await queryInterface.sequelize.query(`
            UPDATE branches 
            SET "currencySymbol" = 'KSh' 
            WHERE "currencySymbol" = '$';
        `);
    }
};