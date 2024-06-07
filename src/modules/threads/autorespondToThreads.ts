import { ExtendedClient } from "../../interfaces/ExtendedClient";
import { errorHandler } from "../../utils/errorHandler";
import { fetchHelpThreads } from "../fetchHelpThreads";

/**
 * Fetches the threads from the help channel, finds unanswered threads, posts a response to
 * threads that have not received a message in 7 days, or in 14 days.
 *
 * @param {ExtendedClient} bot The bot's Discord instance.
 */
export const autorespondToThreads = async (bot: ExtendedClient) => {
  try {
    const threads = await fetchHelpThreads(bot);
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
      /**
       * If it's somehow archived but never got labelled, mark it as inactive.
       */
      if (thread.archived) {
        await thread.setArchived(false);
        await thread.setAppliedTags([
          ...thread.appliedTags,
          bot.cache.inactiveTag,
        ]);
        await thread.setArchived(true);
        continue;
      }
      const lastMessageQuery = await thread.messages
        .fetch({ limit: 1 })
        .catch(async (err) => {
          await errorHandler(
            bot,
            `fetch messages for thread ${thread.id}`,
            err
          );
        });
      const latestMessages = await thread.messages
        .fetch()
        .catch(async (err) => {
          await errorHandler(
            bot,
            `fetch messages for thread ${thread.id}`,
            err
          );
        });
      const starterMessage = await thread
        .fetchStarterMessage()
        .catch(async (err) => {
          await errorHandler(
            bot,
            `fetch starter message for thread ${thread.id}`,
            err
          );
        });
      if (!lastMessageQuery || !latestMessages || !starterMessage) {
        await thread
          .setAppliedTags([...thread.appliedTags, bot.cache.inactiveTag])
          .catch(
            async (err) => await errorHandler(bot, "set inactive tag", err)
          );
        continue;
      }
      const lastMessage = lastMessageQuery.first();
      const owner = await thread.fetchOwner().catch(async (err) => {
        await errorHandler(bot, `fetch owner for thread ${thread.id}`, err);
      });
      /**
       * If the bot can't see the last message or the thread owner, then
       * apply the inactive label so the bot doesn't process it anymore. Since
       * this should really only happen if the OP leaves the server, this should
       * be safe to do...
       */
      if (!lastMessage || !owner) {
        await thread.setAppliedTags([
          ...thread.appliedTags,
          bot.cache.inactiveTag,
        ]);
        continue;
      }
      /**
       * This logic now needs to come first, because a thread that has been silent
       * for this long needs the label applied.
       * Additionally, let's stop caring if the thread is even older - let's just
       * slap the label on anything that isn't labelled.
       * Archived threads should be labelled, too.
       */
      if (
        lastMessage.createdTimestamp < Date.now() - 1000 * 60 * 60 * 24 * 14 &&
        !thread.appliedTags.includes(bot.cache.inactiveTag)
      ) {
        /**
         * Threads that are 14 days old should have been auto-archived by Discord as
         * this is the maximum TTL for a thread. So we just need to label them.
         */
        if (thread.archived) {
          /**
           * Cannot apply tags without unarchiving. Theoretically this should never be
           * true, as archived threads are handled earlier. But let's be safe.
           */
          await thread.setArchived(false);
        }
        await thread
          .setAppliedTags([...thread.appliedTags, bot.cache.inactiveTag])
          .catch(
            async (err) => await errorHandler(bot, "set inactive tag", err)
          );
        await thread.setArchived(true);
        continue;
      }
      /**
       * We don't want to respond if the last message in the thread
       * was sent by the OP.
       * Note that this won't work as expected for posts moved by
       * the bot.
       */
      if (lastMessage.author.id === owner.id && owner.id !== bot.user?.id) {
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
      if (lastMessage.createdTimestamp < Date.now() - 1000 * 60 * 60 * 24 * 7) {
        /**
         * When the last message is from the bot, it's the auto-response
         * message. Instead of responding again, we just want to close it.
         */
        if (lastMessage.author.id === bot.user?.id) {
          await thread
            .setAppliedTags([...thread.appliedTags, bot.cache.inactiveTag])
            .catch(
              async (err) => await errorHandler(bot, "set inactive tag", err)
            );
          await thread
            .setArchived(true)
            .catch(
              async (err) => await errorHandler(bot, "set archived thread", err)
            );
          continue;
        }
        await thread
          .send({
            content: `Hey there <@!${owner.id}>~! Did you forget about this thread? Let us know if you still need help!`,
          })
          .catch(
            async (err) => await errorHandler(bot, "send autoresponse", err)
          );
      }
    }
  } catch (err) {
    await errorHandler(bot, "autorespond to threads", err);
  }
};
