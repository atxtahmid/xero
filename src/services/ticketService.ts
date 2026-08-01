import {
  TicketCategoryType,
  TicketStatus,
} from "@prisma/client";

import db from "./database.js";

const ACTIVE_STATUSES: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.LOCKED,
];

const ticketInclude = {
  panel: true,
  creator: true,
  claimedBy: true,
} as const;

class TicketService {
  async create(
    guildId: string,
    panelId: string,
    channelId: string,
    creatorId: string,
    category: TicketCategoryType = TicketCategoryType.GENERAL,
  ) {
    return db.ticket.create({
      data: {
        guildId,
        panelId,
        channelId,
        creatorId,
        category,
        status: TicketStatus.OPEN,
      },
      include: ticketInclude,
    });
  }

  async getByChannel(channelId: string) {
    return db.ticket.findUnique({
      where: { channelId },
      include: ticketInclude,
    });
  }

  async exists(
    guildId: string,
    panelId: string,
    creatorId: string,
  ): Promise<boolean> {
    const ticket = await db.ticket.findFirst({
      where: {
        guildId,
        panelId,
        creatorId,
        status: {
          in: ACTIVE_STATUSES,
        },
      },
      select: {
        id: true,
      },
    });

    return ticket !== null;
  }

  async claim(channelId: string, userId: string) {
    const result = await db.ticket.updateMany({
      where: {
        channelId,
        claimedById: null,
        status: {
          in: ACTIVE_STATUSES,
        },
      },
      data: {
        claimedById: userId,
      },
    });

    if (result.count === 0) {
      throw new Error(
        "Ticket is either already claimed, closed, or does not exist.",
      );
    }

    const updated = await this.getByChannel(channelId);

    if (!updated) {
      throw new Error("Failed to load updated ticket.");
    }

    return updated;
  }

  async unclaim(channelId: string) {
    const ticket = await this.getByChannel(channelId);

    if (!ticket) {
      throw new Error("Ticket does not exist.");
    }

    if (!ticket.claimedById) {
      throw new Error("Ticket is not claimed.");
    }

    if (!ACTIVE_STATUSES.includes(ticket.status)) {
      throw new Error("Only active tickets can be unclaimed.");
    }

    return db.ticket.update({
      where: {
        channelId,
      },
      data: {
        claimedById: null,
      },
      include: ticketInclude,
    });
  }

  async lock(channelId: string) {
    const ticket = await this.getByChannel(channelId);

    if (!ticket || ticket.status !== TicketStatus.OPEN) {
      throw new Error("Only open tickets can be locked.");
    }

    return db.ticket.update({
      where: {
        channelId,
      },
      data: {
        status: TicketStatus.LOCKED,
      },
      include: ticketInclude,
    });
  }

  async unlock(channelId: string) {
    const ticket = await this.getByChannel(channelId);

    if (!ticket || ticket.status !== TicketStatus.LOCKED) {
      throw new Error("Only locked tickets can be unlocked.");
    }

    return db.ticket.update({
      where: {
        channelId,
      },
      data: {
        status: TicketStatus.OPEN,
      },
      include: ticketInclude,
    });
  }

  async close(channelId: string) {
    const ticket = await this.getByChannel(channelId);

    if (!ticket || ticket.status === TicketStatus.CLOSED) {
      throw new Error("Ticket is already closed or does not exist.");
    }

    return db.ticket.update({
      where: {
        channelId,
      },
      data: {
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
      },
      include: ticketInclude,
    });
  }

  async reopen(channelId: string) {
    const ticket = await this.getByChannel(channelId);

    if (!ticket || ticket.status !== TicketStatus.CLOSED) {
      throw new Error("Only closed tickets can be reopened.");
    }

    return db.ticket.update({
      where: {
        channelId,
      },
      data: {
        status: TicketStatus.OPEN,
        closedAt: null,
        claimedById: null,
      },
      include: ticketInclude,
    });
  }

  async setTranscript(channelId: string, url: string) {
    return db.ticket.update({
      where: {
        channelId,
      },
      data: {
        transcriptUrl: url,
      },
    });
  }

  async delete(channelId: string) {
    try {
      return await db.ticket.delete({
        where: {
          channelId,
        },
      });
    } catch {
      return null;
    }
  }

  async listOpenTickets(guildId: string) {
    return db.ticket.findMany({
      where: {
        guildId,
        status: {
          in: ACTIVE_STATUSES,
        },
      },
      include: ticketInclude,
      orderBy: {
        createdAt: "asc",
      },
    });
  }
}

export default new TicketService();