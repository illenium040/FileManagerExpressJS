"use strict";

const scope = document.querySelector("body");

export const normalizePosition = (mouseX, mouseY, contextMenu) => {
  let { left: scopeOffsetX, top: scopeOffsetY } = scope.getBoundingClientRect();

  scopeOffsetX = scopeOffsetX < 0 ? 0 : scopeOffsetX;
  scopeOffsetY = scopeOffsetY < 0 ? 0 : scopeOffsetY;

  const scopeX = mouseX - scopeOffsetX;
  const scopeY = mouseY - scopeOffsetY;
  const outOfBoundsOnX = scopeX + contextMenu.clientWidth > scope.clientWidth;
  const outOfBoundsOnY = scopeY + contextMenu.clientHeight > scope.clientHeight;

  let normalizedX = mouseX;
  let normalizedY = mouseY;
  if (outOfBoundsOnX) {
    normalizedX = scopeOffsetX + scope.clientWidth - contextMenu.clientWidth;
  }
  if (outOfBoundsOnY) {
    normalizedY = scopeOffsetY + scope.clientHeight - contextMenu.clientHeight;
  }

  return { normalizedX, normalizedY };
};

export const onContextMenu = (contextMenu) => {
  const { clientX: mouseX, clientY: mouseY } = event;

  const { normalizedX, normalizedY } = normalizePosition(
    mouseX,
    mouseY,
    contextMenu
  );

  contextMenu.classList.remove("visible");

  contextMenu.style.top = `${normalizedY}px`;
  contextMenu.style.left = `${normalizedX}px`;

  setTimeout(() => {
    contextMenu.classList.add("visible");
  });
};

export const subscribeToContextMenu = (element, menu, callback) => {
  element.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    onContextMenu(menu);
    if (callback) callback(event);
  });
};
export const init = ([...menus]) => {
  scope.addEventListener("click", (e) => {
    for (const m of menus) {
      m.classList.remove("visible");
    }
  });
};
