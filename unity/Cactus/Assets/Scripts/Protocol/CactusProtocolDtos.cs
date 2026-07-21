using System;
using System.Collections.Generic;

namespace Cactus.Protocol
{
    // Field names intentionally match the TypeScript/Colyseus MessagePack contract.
    // Face-down cards remain null in RedactedSlotDto.card.
    [Serializable]
    public sealed class CardDto
    {
        public string id;
        public string rank;
        public string suit;
        public int value;
    }

    [Serializable]
    public sealed class BoardTargetDto
    {
        public string playerId;
        public string slotId;
    }

    [Serializable]
    public sealed class RedactedSlotDto
    {
        public string slotId;
        public bool faceUp;
        public CardDto card;
    }

    [Serializable]
    public sealed class RedactedPlayerDto
    {
        public string id;
        public string name;
        public string avatarId;
        public List<RedactedSlotDto> board;
        public bool isConnected;
        public bool hasCalledCactus;
    }

    [Serializable]
    public sealed class PeekCardDto
    {
        public string slotId;
        public CardDto card;
    }

    [Serializable]
    public sealed class PendingActionDto
    {
        public string type;
        public string actingPlayerId;
        public string stage;
        public BoardTargetDto qLookTarget;
    }

    [Serializable]
    public sealed class PendingGiveDto
    {
        public string fromPlayerId;
        public string toPlayerId;
    }

    [Serializable]
    public sealed class RoomViewDto
    {
        public string gameId;
        public string you;
        public List<RedactedPlayerDto> players;
        public List<string> turnOrder;
        public string currentPlayerId;
        public int drawPileCount;
        public List<CardDto> discardPile;
        public string phase;
        public string turnStage;
        public CardDto drawnCard;
        public string cactusCallerId;
        public bool matchWindowOpen;
        public PendingActionDto pendingAction;
        public PendingGiveDto pendingGive;
        public List<PeekCardDto> peekCards;
        public long serverNowMs;
        public long? peekEndsAtMs;
        public long? matchWindowEndsAtMs;
    }

    [Serializable]
    public sealed class LobbyPlayerDto
    {
        public string sessionId;
        public string name;
        public string avatarId;
    }

    [Serializable]
    public sealed class LobbyDto
    {
        public string roomId;
        public List<LobbyPlayerDto> players;
        public string hostSessionId;
    }

    [Serializable]
    public sealed class RevealedDto
    {
        public BoardTargetDto target;
        public CardDto card;
    }

    [Serializable]
    public sealed class ScoresDto
    {
        public Dictionary<string, int> totals;
        public List<string> winnerIds;
    }

    [Serializable]
    public sealed class PublicEventDto
    {
        public string type;
        public string playerId;
        public string action;
        public string discardEventId;
        public string outcome;
        public CardDto card;
        public BoardTargetDto target;
        public int peekMs;
    }

    [Serializable]
    public sealed class ErrorDto
    {
        public string code;
        public string message;
    }
}
