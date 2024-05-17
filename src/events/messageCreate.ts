import { ChannelType, Message } from "discord.js";

import { ExtendedClient } from "../interfaces/ExtendedClient";
import { errorHandler } from "../utils/errorHandler";
import { sendMessageToSupabase } from "../utils/sendToSupabase";
import { sleep } from "../utils/sleep";

import { ACTION } from "./action.types";

/**
 * Handles the thread create event.
 *
 * @param {ExtendedClient} bot The bot's Discord instance.
 * @param {Message} message The thread channel payload from Discord.
 */
export const messageCreate = async (bot: ExtendedClient, message: Message) => {
  try {
    if (
      message.channel &&
      (message.channel.type !== ChannelType.PublicThread ||
        message.channel.parentId !== bot.cache.helpChannel.id)
    ) {
      return;
    }
    await sendMessageToSupabase(ACTION.MESSAGE_CREATE, bot, message);

    await sleep(1000);
  } catch (err) {
    await errorHandler(bot, "message create", err);
  }
};
