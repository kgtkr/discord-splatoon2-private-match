import fs from "fs-extra";
import * as Discord from "discord.js";

interface Config {
  token: string
}

interface Match {

}

const guildName = "水死体トゥーン";
const mainTextChannelName = "プラベ";
const alphaTextChannelName = "アルファ";
const bravoTextChannelName = "ブラボー";
const gmRoleName = "GM";
const rankRoleNames = ["C", "B", "A", "S", "S+", "X"];


(async () => {
  const config: Config = JSON.parse(await fs.readFile(".env.json", { encoding: "utf-8" }));
  const client = new Discord.Client();
  client.login(config.token);

  client.on('ready', () => {
    const guild = unwrap(client.guilds.array().find(x => x.name === guildName));
    const gmRole = unwrap(guild.roles.array().find(x => x.name === gmRoleName));
    const gm = unwrap(gmRole.members.array()[0]);
    const rankRoles = rankRoleNames.map(name => unwrap(guild.roles.array().find(x => x.name === name)));
    const mainTextChannel = unwrap(guild.channels.array().find(x => x.name === mainTextChannelName));
    const members = new Set<string>();
    let match: Match | null = null;

    client.on('message', msg => {
      if (msg.channel.id === mainTextChannel.id) {
        if (msg.member.id === gm.id) {
          if (msg.content === "\\開始") {
            if (match === null) {

            } else {
              msg.reply("既に開始しています。");
            }
          } else if (msg.content === "\\終了") {
            if (match !== null) {

            } else {
              msg.reply("開始されていません。");
            }
          }
        }

        if (msg.content === "\\参加") {
          if (!members.has(msg.member.id)) {
            members.add(msg.member.id);
            if (msg.member.roles.array().find(role => rankRoles.find(x => x.id === role.id) !== undefined) !== undefined) {
              msg.reply("追加しました。");
            } else {
              msg.reply("追加しました。ウデマエが設定されていません。開始までに設定されない場合はSとして扱われます。")
            }
          } else {
            msg.reply("既に追加しています。");
          }
        } else if (msg.content === "\\削除") {
          if (members.has(msg.member.id)) {
            members.delete(msg.member.id);
            msg.reply("削除しました。");
          } else {
            msg.reply("存在しません。");
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