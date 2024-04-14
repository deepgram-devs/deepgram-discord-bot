import {
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { ResponseText } from "../config/ResponseText";
import { Command } from "../interfaces/Command";
import { fetchHelpThreads } from "../modules/fetchHelpThreads";
import { errorHandler } from "../utils/errorHandler";

export const stats: Command = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Generate a report on help threads.")
    .setDMPermission(false)
    .addNumberOption((o) =>
      o
        .setName("start")
        .setDescription(
          "Timestamp (in ms) of time you'd like to start tracking from."
        )
    )
    .addNumberOption((o) =>
      o
        .setName("end")
        .setDescription(
          "Timestamp (in ms) of time you'd like to end tracking from."
        )
    ),
  run: async (bot, interaction) => {
    try {
      await interaction.deferReply({ ephemeral: true });

      const { member } = interaction;
      if (
        !member ||
        !(member instanceof GuildMember) ||
        (!bot.env.helperRoles.some((r) => member.roles.cache.has(r)) &&
          !member.permissions.has(PermissionFlagsBits.Administrator))
      ) {
        await interaction.editReply({
          content: ResponseText.MustBeHelper,
        });
        return;
      }

      const threads = await fetchHelpThreads(bot);
      let sorted = threads
        .map((e) => e)
        .sort((a, b) => (b.createdTimestamp ?? 0) - (a.createdTimestamp ?? 0));
      const start = interaction.options.getNumber("start");
      const end = interaction.options.getNumber("end");

      if (start) {
        sorted = sorted.filter(
          (t) => t.createdTimestamp && t.createdTimestamp >= start
        );
      }
      if (end) {
        sorted = sorted.filter(
          (t) => t.createdTimestamp && t.createdTimestamp <= end
        );
      }

      const total = sorted.length;
      const answeredArray = sorted.filter((thread) =>
        thread.appliedTags.includes(bot.cache.answerTag)
      );
      const answered = answeredArray.length;
      const unanswered = sorted.filter(
        (thread) => !thread.appliedTags.includes(bot.cache.answerTag)
      ).length;
      const inactive = sorted.filter((thread) =>
        thread.appliedTags.includes(bot.cache.inactiveTag)
      ).length;
      const open = sorted.filter((thread) => !thread.archived).length;
      const closed = sorted.filter((thread) => thread.archived).length;
      const moved = sorted.filter(
        (thread) => thread.ownerId === bot.user?.id
      ).length;

      /* TODO: Original plan of checking based on updatedAt doesn't work because that doesn't exist for threads. */
      //   const averageTime = answeredArray.reduce((thread, sum) => {
      //     sum += (thread.)
      //   })

      await interaction.editReply({
        content: `# Help Channel Stats:
- Answered Threads: ${answered}
- Unanswered Threads: ${unanswered}
- Inactive Threads: ${inactive}
- Open Threads: ${open}
- Closed Threads: ${closed}
- Moved Threads: ${moved}
─────────────────────────
- Average time to answer: Coming soon?
- Total Threads: ${total}`,
      });
    } catch (err) {
      await errorHandler(bot, "stats command", err);
    }
  },
};
