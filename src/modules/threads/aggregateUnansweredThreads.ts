import { ExtendedClient } from "../../interfaces/ExtendedClient";
import { errorHandler } from "../../utils/errorHandler";
import { stripLinks } from "../../utils/stripLinks";
import { fetchHelpThreads } from "../fetchHelpThreads";

/**
 * Fetches the threads from the help channel, finds unanswered threads, posts a list
 * in the mod channel.
 *
 * @param {ExtendedClient} bot The bot's Discord instance.
 */
export const aggregateUnansweredThreads = async (bot: ExtendedClient) => {
  try {
    const threads = await fetchHelpThreads(bot);
    const unanswered = threads.filter(
      (thread) =>
        !thread.appliedTags.includes(bot.cache.answerTag) &&
        !thread.appliedTags.includes(bot.cache.inactiveTag)
    );
    const mapped = unanswered
      .map((e) => e)
      .sort((a, b) => (a.createdTimestamp ?? 0) - (b.createdTimestamp ?? 0))
      .map((t) => `- [${stripLinks(t.name)}](<${t.url}>)`);

    await bot.cache.modChannel.send({
      content: `Please take a look at these threads which are waiting for an answer.\n${mapped
        .splice(0, 5)
        .join("\n")}`,
    });
    while (mapped.length > 0) {
      await bot.cache.modChannel.send({
        content: mapped.splice(0, 5).join("\n"),
      });
    }
  } catch (err) {
    await errorHandler(bot, "aggregate all unanswered threads", err);
  }
};
