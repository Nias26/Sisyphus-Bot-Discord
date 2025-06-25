import { SlashCommandBuilder } from 'discord.js'

export default {
    data: new SlashCommandBuilder()
        .setName('toggle-randomvc')
        .setDescription('Set the state of the RandomVC feature')
        .addBooleanOption(option => 
            option
            .setName('toggle')
            .setDescription('Toggle this feature on/off')
            .setRequired(true)
        ),
    async execute(interaction){
        const value = interaction.options.getBoolean('toggle');

        global.active = value;

        await interaction.reply(`RandomVC() feature set to ${global.active}`);
    }
}