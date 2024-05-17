import { AnyThreadChannel, ChannelType } from "discord.js";

import { ExtendedClient } from "../interfaces/ExtendedClient";
import { errorHandler } from "../utils/errorHandler";
import { sendThreadToSupabase } from "../utils/sendToSupabase";

import { ACTION } from "./action.types";

/**
 * Handles the thread update event.
 *
 * @param {ExtendedClient} bot The bot's Discord instance.
 * @param {AnyThreadChannel} newThread The thread channel payload from Discord.
 * @returns {void} - Void.
 */
export const threadUpdate = async (
  bot: ExtendedClient,
  newThread: AnyThreadChannel
) => {
  try {
    /**
     * Currently we only care about posts in the help channel, so we can ignore everything else.
     * We also type assert to a guild thread for safety.
     */
    if (
      newThread.parent?.id !== bot.cache.helpChannel.id ||
      newThread.type !== ChannelType.PublicThread
    ) {
      return;
    }
    await sendThreadToSupabase(ACTION.THREAD_UPDATE, bot, newThread);
    /**
     * We're logging our support thread messages out to supabase for automation purposes.
     */
  } catch (err) {
    await errorHandler(bot, "thread update", err);
  }
};
