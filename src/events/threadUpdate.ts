import { AnyThreadChannel, ChannelType } from "discord.js";

import { ExtendedClient } from "../interfaces/ExtendedClient";
import { errorHandler } from "../utils/errorHandler";
import { sendToSupabase } from "../utils/sendToSupabase";

/**
 * Handles the thread update event.
 *
 * @param {ExtendedClient} bot The bot's Discord instance.
 * @param {AnyThreadChannel} thread The thread channel payload from Discord.
 */
export const threadUpdate = async (
  bot: ExtendedClient,
  newThread: AnyThreadChannel,
  oldThread: AnyThreadChannel
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

    /**
     * We're logging our support thread messages out to supabase for automation purposes.
     */
    await sendToSupabase("update", bot, { ...newThread, previous: oldThread });
  } catch (err) {
    await errorHandler(bot, "thread update", err);
  }
};
