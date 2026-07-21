using System.Collections.Generic;
using Cactus.Protocol;
using UnityEngine;
using UnityEngine.UI;

namespace Cactus.Presentation
{
    public sealed class CactusBoardPresenter : MonoBehaviour
    {
        private CactusLobbyController lobby;
        private Transform layer;
        private RoomViewDto rendered;

        private void Start()
        {
            lobby = GetComponent<CactusLobbyController>();
            layer = new GameObject("Board layer", typeof(RectTransform)).transform;
            layer.SetParent(GetComponentInChildren<Canvas>().transform, false);
            RenderDemo();
        }

        private void Update()
        {
            var view = lobby.RoomClient == null ? null : lobby.RoomClient.View;
            if (view != null && !ReferenceEquals(view, rendered))
            {
                rendered = view;
                Clear();
                Render(view);
            }
        }

        private void RenderDemo()
        {
            AddPile("Draw pile", new Vector2(0.45f, 0.53f), "?", new Color(0.10f, 0.20f, 0.12f, 1f));
            AddPile("Discard pile", new Vector2(0.56f, 0.53f), "7\n♦", new Color(0.97f, 0.84f, 0.66f, 1f));
            AddBoard(new Vector2(0.50f, 0.32f), null, "SageStrider");
            AddBoard(new Vector2(0.22f, 0.52f), null, "DustyDan");
            AddBoard(new Vector2(0.78f, 0.52f), null, "PricklyPatti");
            AddBoard(new Vector2(0.50f, 0.76f), null, "You");
        }

        private void Render(RoomViewDto view)
        {
            AddPile("Draw pile", new Vector2(0.45f, 0.53f), "?\n" + view.drawPileCount, new Color(0.10f, 0.20f, 0.12f, 1f));
            var top = view.discardPile != null && view.discardPile.Count > 0 ? view.discardPile[view.discardPile.Count - 1] : null;
            AddPile("Discard pile", new Vector2(0.56f, 0.53f), Face(top), new Color(0.97f, 0.84f, 0.66f, 1f));
            var anchors = new[] { new Vector2(0.50f, 0.32f), new Vector2(0.22f, 0.52f), new Vector2(0.78f, 0.52f), new Vector2(0.50f, 0.76f) };
            for (var i = 0; i < view.players.Count && i < anchors.Length; i++) AddBoard(anchors[i], view, view.players[i]);
        }

        private void AddBoard(Vector2 anchor, RoomViewDto view, string label)
        {
            AddLabel(label, anchor + new Vector2(0f, -0.075f));
            for (var i = 0; i < 4; i++) AddCard(anchor + Offset(i), "?", new Color(0.09f, 0.20f, 0.12f, 1f));
        }

        private void AddBoard(Vector2 anchor, RoomViewDto view, RedactedPlayerDto player)
        {
            AddLabel(player.name, anchor + new Vector2(0f, -0.075f));
            for (var i = 0; i < player.board.Count; i++)
            {
                var card = CardVisibility.Resolve(view, player, player.board[i]);
                AddCard(anchor + Offset(i), Face(card), card == null ? new Color(0.09f, 0.20f, 0.12f, 1f) : new Color(0.97f, 0.84f, 0.66f, 1f));
            }
        }

        private static Vector2 Offset(int index) => new Vector2(index % 2 == 0 ? -0.035f : 0.035f, index < 2 ? 0.035f : -0.035f);
        private static string Face(CardDto card) => card == null ? "?" : card.rank + "\n" + Suit(card.suit);
        private static string Suit(string suit) => suit == "diamonds" ? "♦" : suit == "hearts" ? "♥" : suit == "spades" ? "♠" : "♣";

        private void AddPile(string name, Vector2 anchor, string value, Color color) => AddCard(anchor, value, color, name, new Vector2(92f, 128f));
        private void AddCard(Vector2 anchor, string value, Color color, string name = "Card", Vector2? size = null)
        {
            var card = new GameObject(name, typeof(RectTransform), typeof(Image)); card.transform.SetParent(layer, false);
            card.GetComponent<Image>().color = color; Place(card.GetComponent<RectTransform>(), anchor, size ?? new Vector2(64f, 88f));
            var text = Text(card.transform, value, 24, color.r > 0.8f ? new Color(0.62f, 0.10f, 0.07f, 1f) : new Color(0.86f, 0.71f, 0.37f, 1f)); Stretch(text.rectTransform);
        }
        private void AddLabel(string value, Vector2 anchor) { var t = Text(layer, value, 14, Color.white); Place(t.rectTransform, anchor, new Vector2(180f, 24f)); }
        private static Text Text(Transform p, string value, int size, Color color) { var o = new GameObject("Text", typeof(RectTransform), typeof(Text)); o.transform.SetParent(p, false); var t=o.GetComponent<Text>(); t.font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); t.text=value; t.fontSize=size; t.fontStyle=FontStyle.Bold; t.color=color; t.alignment=TextAnchor.MiddleCenter; return t; }
        private static void Place(RectTransform r, Vector2 a, Vector2 s) { r.anchorMin=r.anchorMax=a; r.sizeDelta=s; r.anchoredPosition=Vector2.zero; }
        private static void Stretch(RectTransform r) { r.anchorMin=Vector2.zero; r.anchorMax=Vector2.one; r.offsetMin=r.offsetMax=Vector2.zero; }
        private void Clear() { for (var i=layer.childCount-1;i>=0;i--) Destroy(layer.GetChild(i).gameObject); }
    }
}
