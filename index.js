import dotenv from 'dotenv'
dotenv.config()

import { Client, Events, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import path from 'path';
import fs from 'fs';
import nacl from 'tweetnacl';
import express from 'express';
import parser from 'body-parser';
import axios from 'axios';

var active = true;
var voiceLines = [];
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

// Networking stuff...
/* Not working / Still WIP
const app = express();
const PORT = 3000;
const PUBLIC_KEY = process.env.PUBLIC_KEY;

app.use(parser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString('utf8');
    }
}));

app.post("/interactions", async (req, res) => {
    const signature = req.get("X-Signature-Ed25519");
    const timestamp = req.get("X-Signature-Timestamp");
    const body = req.rawBody;
    const isVerified = nacl.sign.detached.verify(
        Buffer.from(timestamp + body),
        Buffer.from(signature, 'hex'),
        Buffer.from(PUBLIC_KEY, "hex")
    )

    if(!isVerified)
        return res.status(401).end('invalid request signature');

    try {
        const api_ver = 10;
        const url = `https://discord.com/api/v${api_ver}/applications/${process.env.APP_ID}/commands`;
        const json = {
            name: "start",
            type: 1,
            description: "Enable the RandomVC feature",
            options: [
                {
                    name: "state",
                    description: "Turn this feature On or Off",
                    type: 5,
                    required: true,
                }
            ]
        }

        const headers = {
            Authorization: `Bot ${process.env.BOT_TOKEN}`,
            "Content-Type": "application/json",
        }

        axios.post(url, json, { headers }).then( response => {
            console.log("[LOG] Command Created: ", response.data);
        }).catch( error => {
            console.error("[ERR] Error Creating Command: ", error.response?.data || error.message);
        })

    }catch (error){
        console.error("[ERR] Error sending POST request: ", error.response?.data || error.message);
    }
})
*/

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

function startRandomVC(){
    setInterval(async () => {
        if(!active) return;

        const channels = await getActiveVC();
        if(channels.length == 0) return;

        const randChannel = channels[Math.floor(Math.random() * channels.length)];
        console.log(`[LOG] Joining ${randChannel.name}...`);
        await playAudioInVC(randChannel);
    }, 1000*60*process.env.threshold);
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
client.on(Events.MessageCreate, async (message) => {
    if(!message?.author.bot && message.content == "!start"){
        console.log("[LOG] Starting RandomVC()");
        message.channel.send("Starting RandomVC()");
        active = true;
    }else if(!message?.author.bot && message.content == "!stop"){
        console.log("[LOG] Stopping RandomVC()");
        message.channel.send("Stopping RandomVC()");
        active = false;
    }
})

await client.login(process.env.BOT_TOKEN);
app.listen(PORT, () => {
    console.log(`[LOG] Listening on port ${PORT}`);
})