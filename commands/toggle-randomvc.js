import { SlashCommandBuilder } from 'discord.js'
import { vars } from '../values.js'

export default {
    data: new SlashCommandBuilder()
        .setName('toggle-randomvc')
        .setDescription('Set the state of the RandomVC feature')
        .addBooleanOption(option => 
            option
            .setName('set')
            .setDescription('Toggle this feature on/off')
            .setRequired(true)
        ),
    async execute(interaction){
        const value = interaction.options.getBoolean('set');

        vars.active = value;

        await interaction.reply(`RandomVC() feature set to ${vars.active}`);
    }
}