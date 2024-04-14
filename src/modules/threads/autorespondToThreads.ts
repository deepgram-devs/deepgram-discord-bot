import { ExtendedClient } from "../../interfaces/ExtendedClient";
import { errorHandler } from "../../utils/errorHandler";

/**
 * Fetches the threads from the help channel, finds unanswered threads, posts a response to
 * threads that have not received a message in 7 days, or in 14 days.
 *
 * @param {ExtendedClient} bot The bot's Discord instance.
 */
export const autorespondToThreads = async (bot: ExtendedClient) => {
  try {
    const archived = (
      await bot.cache.helpChannel.threads.fetchArchived({ fetchAll: true })
    ).threads;
    const active = (await bot.cache.helpChannel.threads.fetchActive()).threads;
    const threads = [...archived.map((e) => e), ...active.map((e) => e)];
    /**
     * We don't need to run our logic on any thread that has been
     * flagged as answered, or any thread which has already become
     * inactive.
     * No necroposting here.
     */
    const threadsToProcess = threads
      .filter(
        (thread) =>
          !thread.appliedTags.includes(bot.cache.answerTag) &&
          !thread.appliedTags.includes(bot.cache.inactiveTag)
      )
      .map((e) => e)
      .sort((a, b) => (b.createdTimestamp ?? 0) - (a.createdTimestamp ?? 0));

    for (const thread of threadsToProcess) {
      const lastMessage = (await thread.messages.fetch({ limit: 1 })).first();
      const latestMessages = await thread.messages.fetch();
      const starterMessage = await thread.fetchStarterMessage();
      const owner = await thread.fetchOwner();
      if (!lastMessage || !owner) {
        continue;
      }
      /**
       * This logic now needs to come first, because a thread that has been silent
       * for this long needs the label applied.
       * Additionally, let's stop caring if the thread is even older - let's just
       * slap the label on anything that isn't labelled.
       */
      if (
        lastMessage.createdTimestamp < Date.now() - 1000 * 60 * 60 * 24 * 14 &&
        !thread.appliedTags.includes(bot.cache.inactiveTag)
      ) {
        /**
         * Threads that are 14 days old should have been auto-archived by Discord as
         * this is the maximum TTL for a thread. So we just need to label them.
         */
        await thread.setAppliedTags([
          ...thread.appliedTags,
          bot.cache.inactiveTag,
        ]);
      }
      /**
       * We don't want to respond if the last message in the thread
       * was sent by the OP.
       * Note that this won't work as expected for posts moved by
       * the bot.
       */
      if (lastMessage.author.id === owner.id) {
        continue;
      }
      /**
       * So we catch those here:
       * If the bot created the thread, then it would have pinged the user initially.
       * If the user that was pinged in the starter message is the same as the user
       * who sent the last message, it's technically the OP and we don't want to auto-respond.
       */
      if (
        starterMessage &&
        starterMessage.author.id === bot.user?.id &&
        starterMessage.mentions.users.first()?.id === lastMessage.author.id
      ) {
        continue;
      }
      /**
       * We don't want to respond if none of the helpers have engaged with
       * the thread.
       * This is limited to the last 100 messages, but that's also good. It
       * means we can be sure that the recent activity is not ours.
       */
      if (
        !latestMessages.some((m) =>
          bot.env.helperRoles.some((id) => m.member?.roles.cache.has(id))
        )
      ) {
        continue;
      }
      if (
        lastMessage.createdTimestamp > Date.now() - 1000 * 60 * 60 * 24 * 8 &&
        lastMessage.createdTimestamp < Date.now() - 1000 * 60 * 60 * 24 * 7
      ) {
        /**
         * When the last message is from the bot, it's the auto-response
         * message. Instead of responding again, we just want to close it.
         */
        if (lastMessage.author.id === bot.user?.id) {
          await thread.setAppliedTags([
            ...thread.appliedTags,
            bot.cache.inactiveTag,
          ]);
          await thread.setArchived(true);
          continue;
        }
        await thread.send({
          content: `Hey there <@!${owner.id}>~! Did you forget about this thread? Let us know if you still need help!`,
        });
      }
    }
  } catch (err) {
    await errorHandler(bot, "autorespond to threads", err);
  }
};
