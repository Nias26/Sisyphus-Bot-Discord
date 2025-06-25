import { SlashCommandBuilder } from 'discord.js'
import { vars } from '../values.js';

export default {
    data: new SlashCommandBuilder()
        .setName('set-threshold')
        .setDescription('Set the quantity of time when Sisyphus shows up')
        .addIntegerOption(option => 
            option
            .setName('quantity')
            .setDescription('seconds')
            .setRequired(true)
        ),
    async execute(interaction){
        const value = interaction.options.getInteger('quantity');

        vars.threshold = value;

        await interaction.reply(`Threshold set to ${vars.threshold}`);
    }
}