import { AnyThreadChannel } from "discord.js";

import { ExtendedClient } from "../interfaces/ExtendedClient";
import { errorHandler } from "../utils/errorHandler";

/**
 * Module to fetch all threads from the bot's help channel.
 *
 * @param {ExtendedClient} bot The bot's Discord instance.
 * @returns {AnyThreadChannel<boolean>} Array of thread objects from Discord.
 */
export const fetchHelpThreads = async (
  bot: ExtendedClient
): Promise<AnyThreadChannel<boolean>[]> => {
  try {
    const threads = [];
    const activeFetch = await bot.cache.helpChannel.threads.fetch(undefined, {
      cache: true,
    });
    threads.push(...activeFetch.threads.map((e) => e));
    let archivedFetch = (
      await bot.cache.helpChannel.threads.fetchArchived({ limit: 100 })
    ).threads;
    let last = archivedFetch.last();
    while (archivedFetch.size >= 100 && last) {
      threads.push(...archivedFetch.map((e) => e));
      archivedFetch = (
        await bot.cache.helpChannel.threads.fetchArchived({
          limit: 100,
          before: last.id,
        })
      ).threads;
      last = archivedFetch.last();
    }
    return threads;
  } catch (err) {
    await errorHandler(bot, "fetch help threads module", err);
    return [];
  }
};
