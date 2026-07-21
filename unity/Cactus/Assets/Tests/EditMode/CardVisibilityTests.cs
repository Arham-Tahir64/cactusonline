using System.Collections.Generic;
using Cactus.Presentation;
using Cactus.Protocol;
using NUnit.Framework;

namespace Cactus.Tests
{
    public sealed class CardVisibilityTests
    {
        [Test]
        public void OwnBottomCardIsVisibleOnlyDuringAuthoritativePeekPhase()
        {
            var hiddenBottomCard = new RedactedSlotDto { slotId = "bottom-left", faceUp = false, card = null };
            var player = new RedactedPlayerDto { id = "me", board = new List<RedactedSlotDto> { hiddenBottomCard } };
            var card = new CardDto { id = "diamond-3", rank = "3", suit = "diamonds", value = 3 };
            var view = new RoomViewDto
            {
                you = "me",
                phase = "peek",
                peekCards = new List<PeekCardDto> { new PeekCardDto { slotId = "bottom-left", card = card } }
            };

            Assert.That(CardVisibility.Resolve(view, player, hiddenBottomCard), Is.SameAs(card));

            view.phase = "playing";
            Assert.That(CardVisibility.Resolve(view, player, hiddenBottomCard), Is.Null);
        }

        [Test]
        public void PublicFaceUpCardRemainsVisibleOutsidePeekPhase()
        {
            var card = new CardDto { id = "spade-7", rank = "7", suit = "spades", value = 7 };
            var slot = new RedactedSlotDto { slotId = "top-left", faceUp = true, card = card };
            var view = new RoomViewDto { you = "me", phase = "playing" };
            var player = new RedactedPlayerDto { id = "opponent" };

            Assert.That(CardVisibility.Resolve(view, player, slot), Is.SameAs(card));
        }
    }
}
