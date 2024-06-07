import { ChannelType, Message, PartialMessage } from "discord.js";

import { ExtendedClient } from "../interfaces/ExtendedClient";
import { errorHandler } from "../utils/errorHandler";
import { sendMessageToSupabase } from "../utils/sendToSupabase";
import { sleep } from "../utils/sleep";

import { ACTION } from "./action.types";

/**
 * Handles the message update event.
 *
 * @param {ExtendedClient} bot The bot's Discord instance.
 * @param {Message | PartialMessage} message The thread channel payload from Discord.
 */
export const messageUpdate = async (
  bot: ExtendedClient,
  message: Message | PartialMessage
) => {
  try {
    if (
      message.thread &&
      (message.channel.type !== ChannelType.PublicThread ||
        message.channel.parentId !== bot.cache.helpChannel.id)
    ) {
      return;
    }

    await sendMessageToSupabase(ACTION.MESSAGE_UPDATE, bot, message);
    await sleep(1000);
  } catch (err) {
    await errorHandler(bot, "message update", err);
  }
};
