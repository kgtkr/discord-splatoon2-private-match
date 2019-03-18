import fs from "fs-extra";
import * as Discord from "discord.js";

interface Config {
  token: string
}

interface Match {
  createdAt: Date,
  alphaRole: Discord.Role,
  bravoRole: Discord.Role,
  alphaTextChannel: Discord.TextChannel,
  bravoTextChannel: Discord.TextChannel
  alphaVoiceChannel: Discord.VoiceChannel,
  bravoVoiceChannel: Discord.VoiceChannel,
  alphaMembers: Discord.GuildMember[],
  bravoMembers: Discord.GuildMember[],
}

const guildName = "水死体トゥーン";
const mainTextChannelName = "プラベ";
const archiveCategoryName = "プラベアーカイブ";
const alphaTextChannelName = "アルファ";
const bravoTextChannelName = "ブラボー";
const alphaVoiceChannelName = "アルファ";
const bravoVoiceChannelName = "ブラボー";
const alphaRoleName = "アルファ";
const bravoRoleName = "ブラボー";
const gmRoleName = "GM";
const rankRoleNames = ["C", "B", "A", "S", "S+", "X"];

function rankToNumber(rank: string | undefined) {
  switch (rank) {
    case "C": return 1;
    case "B": return 2;
    case "A": return 3;
    case "S": return 4;
    case "S+": return 5;
    case "X": return 6;
  }
  return 4;
}

function shuffle<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const r = Math.floor(Math.random() * (i + 1));
    const tmp = array[i];
    array[i] = array[r];
    array[r] = tmp;
  }
  return array;
}

(async () => {
  const config: Config = JSON.parse(await fs.readFile(".env.json", { encoding: "utf-8" }));
  const client = new Discord.Client();
  client.login(config.token);

  client.on('ready', () => {
    const guild = unwrap(client.guilds.array().find(x => x.name === guildName));
    const gmRole = unwrap(guild.roles.array().find(x => x.name === gmRoleName));
    const gm = unwrap(gmRole.members.array()[0]);
    const rankRoles = rankRoleNames.map(name => unwrap(guild.roles.array().find(x => x.name === name)));
    const mainTextChannel = unwrap(guild.channels.array().find(x => x.name === mainTextChannelName && x instanceof Discord.TextChannel)) as Discord.TextChannel;
    const category = mainTextChannel.parent;
    const archiveCategory = unwrap(guild.channels.array().find(x => x.name === archiveCategoryName && x instanceof Discord.CategoryChannel));
    const members = new Map<string, Discord.GuildMember>();
    let match: Match | null = null;

    client.on('message', async msg => {
      if (msg.channel.id === mainTextChannel.id) {
        if (msg.member.id === gm.id) {
          if (msg.content === "\\開始") {
            if (match === null) {
              const createdAt = new Date();
              const users = shuffle(Array.from(members.values()).slice(0, Math.min(members.size, 8)));
              const alphaMembers: Discord.GuildMember[] = [];
              const bravoMembers: Discord.GuildMember[] = [];
              for (let i = 0; i < users.length; i++) {
                if (i % 2 === 0) {
                  alphaMembers.push(users[i]);
                } else {
                  bravoMembers.push(users[i]);
                }
              }
              const alphaRole = await guild.createRole({ name: alphaRoleName, color: "red" });
              const bravoRole = await guild.createRole({ name: bravoRoleName, color: "blue" });

              const alphaTextChannel = await guild.createChannel(alphaTextChannelName, "text") as Discord.TextChannel;
              await alphaTextChannel.setParent(category);
              await alphaTextChannel.overwritePermissions("@everyone", { READ_MESSAGES: false });
              await alphaTextChannel.overwritePermissions(alphaRole, { READ_MESSAGES: true });

              const bravoTextChannel = await guild.createChannel(bravoTextChannelName, "text") as Discord.TextChannel;
              await bravoTextChannel.setParent(category);
              await bravoTextChannel.overwritePermissions("@everyone", { READ_MESSAGES: false });
              await bravoTextChannel.overwritePermissions(bravoRole, { READ_MESSAGES: true });

              const alphaVoiceChannel = await guild.createChannel(alphaVoiceChannelName, "voice") as Discord.VoiceChannel;
              await alphaVoiceChannel.setParent(category);
              await alphaVoiceChannel.overwritePermissions("@everyone", { CONNECT: false });
              await alphaVoiceChannel.overwritePermissions(alphaRole, { CONNECT: true });

              const bravoVoiceChannel = await guild.createChannel(bravoVoiceChannelName, "voice") as Discord.VoiceChannel;
              await bravoVoiceChannel.setParent(category);
              await bravoVoiceChannel.overwritePermissions("@everyone", { CONNECT: false });
              await bravoVoiceChannel.overwritePermissions(bravoRole, { CONNECT: true });

              for (let x of alphaMembers) {
                await x.addRole(alphaRole);
              }

              for (let x of bravoMembers) {
                await x.addRole(bravoRole);
              }

              match = {
                createdAt,
                alphaRole,
                bravoRole,
                alphaTextChannel,
                bravoTextChannel,
                alphaVoiceChannel,
                bravoVoiceChannel,
                alphaMembers,
                bravoMembers
              };

              await mainTextChannel.send("アルファチーム\n" + Array.from(alphaMembers).map(x => `<@${x}>`).join("\n"));
              await mainTextChannel.send("ブラボーチーム\n" + Array.from(bravoMembers).map(x => `<@${x}>`).join("\n"));
            } else {
              await msg.reply("既に開始しています。");
            }
          } else if (msg.content === "\\終了") {
            if (match !== null) {
              await match.alphaVoiceChannel.delete();
              await match.bravoVoiceChannel.delete();

              await match.alphaTextChannel.setParent(archiveCategory);
              await match.alphaTextChannel.setName(match.createdAt.toISOString() + " " + alphaTextChannelName);
              await match.alphaTextChannel.permissionOverwrites.get("@everyone")!.delete();

              await match.bravoTextChannel.setParent(archiveCategory);
              await match.bravoTextChannel.setName(match.createdAt.toISOString() + " " + bravoTextChannelName);
              await match.bravoTextChannel.permissionOverwrites.get("@everyone")!.delete();

              await match.alphaRole.delete();
              await match.bravoRole.delete();

              match = null;
            } else {
              await msg.reply("開始されていません。");
            }
          }
        }

        if (msg.content === "\\参加") {
          if (!members.has(msg.member.id)) {
            members.set(msg.member.id, msg.member);
            if (msg.member.roles.array().find(role => rankRoles.find(x => x.id === role.id) !== undefined) !== undefined) {
              await msg.reply("追加しました。");
            } else {
              await msg.reply("追加しました。ウデマエが設定されていません。開始までに設定されない場合はSとして扱われます。")
            }
          } else {
            await msg.reply("既に追加しています。");
          }
        } else if (msg.content === "\\削除") {
          if (members.has(msg.member.id)) {
            members.delete(msg.member.id);
            await msg.reply("削除しました。");
          } else {
            await msg.reply("存在しません。");
          }
        }
      }
    });
  });
})();

function unwrap<T>(x: T | null | undefined) {
  if (x === undefined || x === null) {
    throw new Error();
  }

  return x;
}