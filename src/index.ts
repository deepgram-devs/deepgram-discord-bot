import { Client, Events, Message, PartialMessage } from "discord.js";
import { scheduleJob } from "node-schedule";

import { IntentOptions } from "./config/IntentOptions";
import { interactionCreate } from "./events/interactionCreate";
import { messageCreate } from "./events/messageCreate";
import { messageDelete } from "./events/messageDelete";
import { messageUpdate } from "./events/messageUpdate";
import { threadCreate } from "./events/threadCreate";
import { threadDelete } from "./events/threadDelete";
import { threadUpdate } from "./events/threadUpdate";
import { ExtendedClient } from "./interfaces/ExtendedClient";
import { sendStickyMessage } from "./modules/sendStickyMessage";
import { aggregateDailyUnansweredThreads } from "./modules/threads/aggregateDailyUnansweredThreads";
import { aggregateUnansweredThreads } from "./modules/threads/aggregateUnansweredThreads";
import { aggregateWeeklyThreads } from "./modules/threads/aggregateWeeklyThreads";
import { autorespondToThreads } from "./modules/threads/autorespondToThreads";
import { errorHandler } from "./utils/errorHandler";
import { healthCheck } from "./utils/healthCheck";
import { loadChannels } from "./utils/loadChannels";
import { loadCommands } from "./utils/loadCommands";
import { loadContexts } from "./utils/loadContexts";
import { registerCommands } from "./utils/registerCommands";
import { validateEnv } from "./utils/validateEnv";

(async () => {
  try {
    const bot = new Client({ intents: IntentOptions }) as ExtendedClient;
    bot.env = validateEnv();
    await loadCommands(bot);
    await loadContexts(bot);

    bot.on(Events.InteractionCreate, async (interaction) => {
      await interactionCreate(bot, interaction);
    });

    bot.on(Events.ClientReady, async () => {
      await loadChannels(bot);
      await registerCommands(bot);
      await bot.env.debugHook.send({
        content: `Logged in as ${bot.user?.username}`,
      });

      setInterval(
        async () => await healthCheck(bot, "Bot healthy."),
        1440 * 1000 * 60
      );

      setInterval(
        async () => await sendStickyMessage(bot),
        bot.env.stickyFrequency * 1000 * 60
      );

      scheduleJob("0 6 * * *", async () => {
        await autorespondToThreads(bot);
      });

      scheduleJob("0 9 * * *", async () => {
        await aggregateDailyUnansweredThreads(bot);
      });

      scheduleJob("0 10 * * *", async () => {
        await aggregateUnansweredThreads(bot);
      });

      scheduleJob("0 7 * * 1", async () => {
        await aggregateWeeklyThreads(bot);
      });
    });

    bot.on(Events.ThreadCreate, async (thread) => {
      await threadCreate(bot, thread);
    });

    bot.on(Events.ThreadUpdate, async (_oldThread, newThread) => {
      await threadUpdate(bot, newThread);
    });

    bot.on(Events.ThreadDelete, async (thread) => {
      await threadDelete(bot, thread);
    });

    bot.on(Events.MessageCreate, async (message: Message) => {
      await messageCreate(bot, message);
    });

    bot.on(
      Events.MessageUpdate,
      async (_oldMessage, message: Message | PartialMessage) => {
        await messageUpdate(bot, message);
      }
    );

    bot.on(Events.MessageDelete, async (message: Message | PartialMessage) => {
      await messageDelete(bot, message);
    });

    // bot.on(Events.MessageReactionAdd, async (_reaction, _user) => {
    // });

    // bot.on(Events.MessageReactionRemove, async (_reaction, _user) => {
    // });

    await bot.login(bot.env.token);
  } catch (err) {
    const bot = new Client({ intents: IntentOptions }) as ExtendedClient;
    bot.env = validateEnv();
    await errorHandler(bot, "entry file", err);
  }
})();
