/** 用透明画布生成拖拽图，避免浏览器把圆角外的页面背景截进去。 */
export async function createTaskDragImage(
  button: HTMLButtonElement,
): Promise<HTMLImageElement | null> {
  const bounds = button.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(bounds.width);
  canvas.height = Math.ceil(bounds.height);
  const context = canvas.getContext("2d");
  if (!context) return null;

  const buttonStyle = getComputedStyle(button);
  context.beginPath();
  context.roundRect(0.5, 0.5, bounds.width - 1, bounds.height - 1, bounds.height / 2);
  context.fillStyle = getComputedStyle(button.closest("aside") ?? button).backgroundColor;
  context.fill();
  context.fillStyle = buttonStyle.backgroundColor;
  context.fill();
  context.strokeStyle = buttonStyle.borderTopColor;
  context.stroke();
  context.clip();

  const iconContainer = button.firstElementChild;
  if (iconContainer) {
    const rect = iconContainer.getBoundingClientRect();
    context.beginPath();
    context.arc(
      rect.x - bounds.x + rect.width / 2,
      rect.y - bounds.y + rect.height / 2,
      rect.width / 2,
      0,
      Math.PI * 2,
    );
    context.fillStyle = getComputedStyle(iconContainer).backgroundColor;
    context.fill();
  }

  const label = button.querySelector("span");
  if (label) {
    const rect = label.getBoundingClientRect();
    const style = getComputedStyle(label);
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.fillStyle = style.color;
    context.textBaseline = "middle";
    let text = label.textContent ?? "";
    if (context.measureText(text).width > rect.width) {
      while (text && context.measureText(`${text}…`).width > rect.width) text = text.slice(0, -1);
      text += "…";
    }
    context.fillText(text, rect.x - bounds.x, rect.y - bounds.y + rect.height / 2);
  }

  await Promise.all(
    Array.from(button.querySelectorAll("svg"), async (svg): Promise<void> => {
      const rect = svg.getBoundingClientRect();
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("stroke", getComputedStyle(svg).color);
      const icon = new Image();
      icon.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
      await icon.decode();
      context.drawImage(icon, rect.x - bounds.x, rect.y - bounds.y, rect.width, rect.height);
    }),
  );
  const image = new Image();
  image.src = canvas.toDataURL("image/png");
  await image.decode();
  return image;
}
