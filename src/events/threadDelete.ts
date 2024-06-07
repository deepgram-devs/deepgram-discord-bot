import { AnyThreadChannel, ChannelType } from "discord.js";

import { ExtendedClient } from "../interfaces/ExtendedClient";
import { errorHandler } from "../utils/errorHandler";
import { sendThreadToSupabase } from "../utils/sendToSupabase";

import { ACTION } from "./action.types";

/**
 * Handles the thread delete event.
 *
 * @param {ExtendedClient} bot The bot's Discord instance.
 * @param {AnyThreadChannel} thread The thread channel payload from Discord.
 */
export const threadDelete = async (
  bot: ExtendedClient,
  thread: AnyThreadChannel
) => {
  try {
    /**
     * Currently we only care about posts in the help channel, so we can ignore everything else.
     * We also type assert to a guild thread for safety.
     */
    if (
      thread.parent?.id !== bot.cache.helpChannel.id ||
      thread.type !== ChannelType.PublicThread
    ) {
      return;
    }

    /**
     * We're logging our support thread messages out to supabase for automation purposes.
     */
    await sendThreadToSupabase(ACTION.THREAD_DELETE, bot, thread);
  } catch (err) {
    await errorHandler(bot, "thread delete", err);
  }
};
