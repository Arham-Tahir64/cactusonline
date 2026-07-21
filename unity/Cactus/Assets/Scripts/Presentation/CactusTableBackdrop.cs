using System;
using UnityEngine;
using UnityEngine.UI;

namespace Cactus.Presentation
{
    public sealed class CactusTableBackdrop : MonoBehaviour
    {
        private static readonly Color Ink = new Color(0.055f, 0.042f, 0.027f, 1f);
        private static readonly Color Sand = new Color(0.39f, 0.235f, 0.12f, 1f);
        private static readonly Color Wood = new Color(0.17f, 0.071f, 0.03f, 1f);
        private static readonly Color Felt = new Color(0.095f, 0.22f, 0.13f, 1f);
        private static readonly Color Gold = new Color(1f, 0.66f, 0.21f, 1f);
        private static readonly Color Cream = new Color(1f, 0.88f, 0.65f, 1f);

        private void Awake()
        {
            Build();
        }

        private void Build()
        {
            var canvas = new GameObject("Cactus Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvas.transform.SetParent(transform, false);
            var canvasComponent = canvas.GetComponent<Canvas>();
            canvasComponent.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasComponent.pixelPerfect = false;
            var scaler = canvas.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.55f;

            var root = CreatePanel("Backdrop", canvas.transform, Ink, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            AddAmbientBackdrop(root.transform);
            AddTable(root.transform);
            AddHeader(root.transform);
            AddSeat(root.transform, "SageStrider", "S", new Vector2(0.5f, 0.76f), new Color(0.55f, 0.23f, 0.4f), 7);
            AddSeat(root.transform, "DustyDan", "D", new Vector2(0.14f, 0.50f), new Color(0.18f, 0.40f, 0.65f), 12);
            AddSeat(root.transform, "PricklyPatti", "P", new Vector2(0.86f, 0.50f), new Color(0.55f, 0.25f, 0.73f), 5);
            AddSeat(root.transform, "You", "Y", new Vector2(0.31f, 0.85f), new Color(0.87f, 0.59f, 0.15f), 11);
        }

        private static void AddAmbientBackdrop(Transform parent)
        {
            var horizon = CreatePanel("Desert Horizon", parent, Sand, new Vector2(0f, 0.57f), new Vector2(1f, 1f), Vector2.zero, Vector2.zero);
            horizon.GetComponent<Image>().color = new Color(0.22f, 0.12f, 0.07f, 1f);
            AddCircle(parent, "Lantern glow left", new Vector2(0.08f, 0.36f), new Vector2(240f, 240f), new Color(1f, 0.35f, 0.04f, 0.09f));
            AddCircle(parent, "Lantern glow right", new Vector2(0.90f, 0.39f), new Vector2(220f, 220f), new Color(1f, 0.35f, 0.04f, 0.08f));
            AddCactusSilhouette(parent, new Vector2(0.17f, 0.31f), 1.1f);
            AddCactusSilhouette(parent, new Vector2(0.80f, 0.32f), 1.25f);
            AddCactusSilhouette(parent, new Vector2(0.09f, 0.66f), 0.6f);
        }

        private static void AddTable(Transform parent)
        {
            AddOval(parent, "Table glow", new Vector2(0.5f, 0.54f), new Vector2(1640f, 840f), new Color(1f, 0.38f, 0.03f, 0.10f));
            AddOval(parent, "Carved wood rim", new Vector2(0.5f, 0.54f), new Vector2(1620f, 820f), Wood);
            AddOval(parent, "Gold inlay", new Vector2(0.5f, 0.54f), new Vector2(1564f, 770f), new Color(0.72f, 0.38f, 0.09f, 1f));
            AddOval(parent, "Green felt", new Vector2(0.5f, 0.54f), new Vector2(1525f, 735f), Felt);
            AddOval(parent, "Felt center", new Vector2(0.5f, 0.54f), new Vector2(1450f, 675f), new Color(0.105f, 0.27f, 0.16f, 1f));
        }

        private static void AddHeader(Transform parent)
        {
            var title = CreateText("Title", parent, "🌵  Cactus  🌵", 58, FontStyle.Bold, Cream, TextAnchor.MiddleCenter);
            SetAnchored(title.rectTransform, new Vector2(0.5f, 0.94f), new Vector2(540f, 80f));
            var code = CreateText("Room code", parent, "CAC-7XQ2   ▣", 20, FontStyle.Bold, Cream, TextAnchor.MiddleCenter);
            code.GetComponent<Text>().color = new Color(0.92f, 0.73f, 0.42f, 1f);
            var codePanel = CreatePanel("Room code plate", parent, new Color(0.05f, 0.035f, 0.025f, 0.86f), new Vector2(0.5f, 0.89f), new Vector2(190f, 42f));
            code.transform.SetParent(codePanel.transform, false);
            Stretch(code.rectTransform, new Vector2(8f, 0f), new Vector2(-8f, 0f));
            CreateButton("Menu", parent, "☰", new Vector2(0.035f, 0.94f), new Vector2(68f, 62f), new Color(0.07f, 0.055f, 0.04f, 0.92f));
            CreateButton("Help", parent, "?", new Vector2(0.89f, 0.94f), new Vector2(60f, 60f), new Color(0.07f, 0.055f, 0.04f, 0.92f));
            CreateButton("Sound", parent, "♫", new Vector2(0.93f, 0.94f), new Vector2(60f, 60f), new Color(0.07f, 0.055f, 0.04f, 0.92f));
            CreateButton("Settings", parent, "⚙", new Vector2(0.97f, 0.94f), new Vector2(60f, 60f), new Color(0.07f, 0.055f, 0.04f, 0.92f));
        }

        private static void AddSeat(Transform parent, string playerName, string initial, Vector2 anchor, Color accent, int score)
        {
            var badge = CreatePanel(playerName + " badge", parent, new Color(0.055f, 0.047f, 0.035f, 0.9f), anchor, new Vector2(235f, 54f));
            var stripe = CreatePanel("Accent", badge.transform, accent, new Vector2(0f, 0.5f), new Vector2(10f, 54f));
            var avatar = AddCircle(badge.transform, "Avatar", new Vector2(0.13f, 0.5f), new Vector2(42f, 42f), accent);
            var initialText = CreateText("Initial", avatar.transform, initial, 20, FontStyle.Bold, Color.white, TextAnchor.MiddleCenter);
            Stretch(initialText.rectTransform, Vector2.zero, Vector2.zero);
            var name = CreateText("Name", badge.transform, playerName, 19, FontStyle.Bold, Color.white, TextAnchor.MiddleLeft);
            SetAnchored(name.rectTransform, new Vector2(0.23f, 0.5f), new Vector2(120f, 42f));
            var cactus = CreateText("Score", badge.transform, "🌵 " + score, 18, FontStyle.Bold, Cream, TextAnchor.MiddleRight);
            SetAnchored(cactus.rectTransform, new Vector2(0.94f, 0.5f), new Vector2(74f, 42f));
            stripe.transform.SetAsFirstSibling();
        }

        private static GameObject CreatePanel(string name, Transform parent, Color color, Vector2 anchor, Vector2 size)
        {
            var panel = CreatePanel(name, parent, color, anchor, anchor, Vector2.zero, size);
            return panel;
        }

        private static GameObject CreatePanel(string name, Transform parent, Color color, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax)
        {
            var panel = new GameObject(name, typeof(RectTransform), typeof(Image));
            panel.transform.SetParent(parent, false);
            var image = panel.GetComponent<Image>();
            image.color = color;
            var rect = panel.GetComponent<RectTransform>();
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.offsetMin = offsetMin;
            rect.offsetMax = offsetMax;
            return panel;
        }

        private static OvalGraphic AddOval(Transform parent, string name, Vector2 anchor, Vector2 size, Color color)
        {
            var oval = new GameObject(name, typeof(RectTransform), typeof(OvalGraphic));
            oval.transform.SetParent(parent, false);
            var graphic = oval.GetComponent<OvalGraphic>();
            graphic.color = color;
            SetAnchored(oval.GetComponent<RectTransform>(), anchor, size);
            return graphic;
        }

        private static Image AddCircle(Transform parent, string name, Vector2 anchor, Vector2 size, Color color)
        {
            var circle = CreatePanel(name, parent, color, anchor, size);
            var image = circle.GetComponent<Image>();
            image.sprite = Resources.GetBuiltinResource<Sprite>("UI/Skin/Knob.psd");
            image.type = Image.Type.Simple;
            return image;
        }

        private static void AddCactusSilhouette(Transform parent, Vector2 anchor, float scale)
        {
            var cactus = new GameObject("Cactus silhouette", typeof(RectTransform));
            cactus.transform.SetParent(parent, false);
            SetAnchored(cactus.GetComponent<RectTransform>(), anchor, new Vector2(90f * scale, 150f * scale));
            var color = new Color(0.08f, 0.24f, 0.13f, 0.72f);
            CreatePanel("Stem", cactus.transform, color, new Vector2(0.5f, 0.5f), new Vector2(21f * scale, 110f * scale));
            CreatePanel("Left arm", cactus.transform, color, new Vector2(0.31f, 0.54f), new Vector2(29f * scale, 18f * scale));
            CreatePanel("Right arm", cactus.transform, color, new Vector2(0.69f, 0.68f), new Vector2(29f * scale, 18f * scale));
        }

        private static Button CreateButton(string name, Transform parent, string label, Vector2 anchor, Vector2 size, Color color)
        {
            var button = CreatePanel(name, parent, color, anchor, size);
            var component = button.AddComponent<Button>();
            var text = CreateText("Label", button.transform, label, 28, FontStyle.Bold, Cream, TextAnchor.MiddleCenter);
            Stretch(text.rectTransform, Vector2.zero, Vector2.zero);
            return component;
        }

        private static Text CreateText(string name, Transform parent, string value, int fontSize, FontStyle style, Color color, TextAnchor alignment)
        {
            var label = new GameObject(name, typeof(RectTransform), typeof(Text));
            label.transform.SetParent(parent, false);
            var text = label.GetComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.text = value;
            text.fontSize = fontSize;
            text.fontStyle = style;
            text.color = color;
            text.alignment = alignment;
            text.horizontalOverflow = HorizontalWrapMode.Overflow;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            return text;
        }

        private static void SetAnchored(RectTransform rect, Vector2 anchor, Vector2 size)
        {
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.sizeDelta = size;
            rect.anchoredPosition = Vector2.zero;
        }

        private static void Stretch(RectTransform rect, Vector2 offsetMin, Vector2 offsetMax)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = offsetMin;
            rect.offsetMax = offsetMax;
        }
    }

    public sealed class OvalGraphic : MaskableGraphic
    {
        [SerializeField] private int segments = 80;

        protected override void OnPopulateMesh(VertexHelper vertices)
        {
            vertices.Clear();
            var rect = rectTransform.rect;
            var center = rect.center;
            var radiusX = rect.width * 0.5f;
            var radiusY = rect.height * 0.5f;
            var vertex = UIVertex.simpleVert;
            vertex.color = color;
            vertex.position = center;
            vertices.AddVert(vertex);

            for (var index = 0; index <= segments; index++)
            {
                var angle = index * Mathf.PI * 2f / segments;
                vertex.position = center + new Vector2(Mathf.Cos(angle) * radiusX, Mathf.Sin(angle) * radiusY);
                vertices.AddVert(vertex);
                if (index > 0)
                {
                    vertices.AddTriangle(0, index, index + 1);
                }
            }
        }
    }
}
