import dotenv from 'dotenv'
dotenv.config()

import { Client, Events, GatewayIntentBits, Collection, MessageFlags, REST, Routes } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import { pathToFileURL } from 'url';
import { vars } from './values.js';
import path from 'path';
import fs from 'fs';

vars.threshold = process.env.threshold;
let voiceLines = [];
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ]
})

client.commands = new Collection();
const commands = [];
const commandPath = path.join(path.resolve(), 'commands');
const commandFiles = fs.readdirSync(commandPath);

for(const file of commandFiles){
    const filePath = path.join(commandPath, file);
    const commandModule = await import(pathToFileURL(filePath));
    const command = commandModule.default;

    if('data' in command && 'execute' in command){
        commands.push(command.data.toJSON());
        client.commands.set(command.data.name, command);
    }else {
        console.warn(`[WARN] Missing data or execute on command at ${filePath}`);
    }
}

// Networking stuff...
const rest = new REST().setToken(process.env.BOT_TOKEN);
try{
    console.log(`[LOG] Started refreshing ${commands.length} application (/) commands.`);
    await rest.put(
        Routes.applicationCommands(process.env.APP_ID),
        { body: commands },
    );

    console.log('[LOG] Successfully reloaded application (/) commands.');
}catch (error){
    console.error("[ERR] Error sending commands: ", error);
}

function getVoiceLinesFiles(){
    const vlPath = path.join(path.resolve(), "voices");
    fs.readdirSync(vlPath).forEach(file => {
        console.log(`[LOG] Found voiceline: ${file}`)
        voiceLines.push(file);
    });
}

function getRandomVoiceLine(){
    return path.join("voices", voiceLines[Math.floor(Math.random() * voiceLines.length)]);
}

async function getActiveVC(){
    const activeChannels = [];

    for(const guild of client.guilds.cache.values()){
        for(const [channelId, channel] of guild.channels.cache){
            if(channel.type == 2 && channel.members.size > 0){ // type 2 = voice channel
                const humans = channel.members.filter(m => !m.user.bot);
                if(humans.size > 0){
                    console.log(`[LOG] Found channel with ${humans.size} users`)
                    activeChannels.push(channel);
                }
            }
        }
    }
    return activeChannels;
}

async function playAudioInVC(channel){
 const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfMute: false,
            selfDeaf: false,
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    }catch (error) {
        console.error(`[ERR] Connecting to voice channel:`, error);
        connection.destroy();
    }

    const player = createAudioPlayer();
    const resource = createAudioResource(getRandomVoiceLine());

    console.log("[LOG] Playing audio...")
    connection.subscribe(player);
     player.play(resource);

    player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy(); // Leave when done
    });
}

async function startRandomVC (){
    console.debug(`[DEBUG]: Active: ${vars.active}, Threshold: ${vars.threshold}`);

    if(!vars.active) return;

    const channels = await getActiveVC();
    if(channels.length == 0) return;

    const randChannel = channels[Math.floor(Math.random() * channels.length)];
    console.log(`[LOG] Joining ${randChannel.name}...`);
    await playAudioInVC(randChannel);

    let delay = 1000*vars.threshold;

    setTimeout(startRandomVC, delay);
}

// Startup
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`[AUTH] Logged in as ${readyClient.user?.tag}`);
    getVoiceLinesFiles();
    startRandomVC();
})

// Messages and mentions events
client.on(Events.MessageCreate, async (message) => {
    if(!message?.author.bot){
        if(message.mentions.has(client.user)){
            message.author.send(`You dare to ping me?`);
            await sleep(3000);
            message.author.send(`You shall do as an appetizer. Come forth, Child of Man… And DIE`);
        }
        // }else {
        //     console.log(`[LOG] ${message.author.tag} said ${message.content}`);
        //     message.channel.send(`I am now here.`);
        // }
    }
})

// Start/Stop RandomVC()
client.on(Events.InteractionCreate, async (interaction) =>{
    if(!interaction.isChatInputCommand())
        return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command){
        console.error(`[ERR] No ${interaction.commandName} command found.`);
        return;
    }

    try {
        await command.execute(interaction);
    }catch(error){
        console.error(`[ERR] Command error: `, error);
        if(interaction.replied || interaction.deferred){
            await interaction.followUp({ content: "I have mistaken you. There has been an error.", flags: MessageFlags.Ephemeral});
        }else {
            await interaction.reply({ content: "I have mistaken you. There has been an error.", flags: MessageFlags.Ephemeral});
        }
    }

    console.log(`[LOG] Command: ${interaction?.commandName}`);
})

// client.on(Events.MessageCreate, async (message) => {
//     if(!message?.author.bot && message.content == "!start"){
//         console.log("[LOG] Starting RandomVC()");
//         message.channel.send("Starting RandomVC()");
//         active = true;
//     }else if(!message?.author.bot && message.content == "!stop"){
//         console.log("[LOG] Stopping RandomVC()");
//         message.channel.send("Stopping RandomVC()");
//         active = false;
//     }
// })

await client.login(process.env.BOT_TOKEN);