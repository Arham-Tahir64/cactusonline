using Cactus.Protocol;

namespace Cactus.Presentation
{
    public static class CardVisibility
    {
        // This is intentionally stateless: a peek must never be retained after the
        // authoritative view moves from the timed peek phase into normal play.
        public static CardDto Resolve(RoomViewDto view, RedactedPlayerDto owner, RedactedSlotDto slot)
        {
            if (view == null || owner == null || slot == null)
            {
                return null;
            }

            if (slot.faceUp)
            {
                return slot.card;
            }

            if (view.phase != "peek" || owner.id != view.you || view.peekCards == null)
            {
                return null;
            }

            foreach (var peek in view.peekCards)
            {
                if (peek != null && peek.slotId == slot.slotId)
                {
                    return peek.card;
                }
            }

            return null;
        }
    }
}
