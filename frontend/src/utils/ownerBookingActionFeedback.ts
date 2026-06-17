/** El usuario repitió una acción que ya se aplicó en el primer clic. */
export function isOwnerBookingStaleActionError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("solo se pueden confirmar reservas pendientes") ||
    m.includes("solo se pueden rechazar reservas pendientes") ||
    m.includes("solo reservas confirmadas pueden completarse") ||
    m.includes("ya fue confirmado") ||
    m.includes("ya fue pagada") ||
    m.includes("ya está cancelada") ||
    m.includes("no puede cancelarse")
  );
}

export function ownerBookingStaleActionToast(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("confirmar reservas pendientes") || m.includes("ya fue confirmado")) {
    return "Esta reserva ya estaba confirmada. La lista está actualizada.";
  }
  if (m.includes("rechazar reservas pendientes")) {
    return "Esta reserva ya no estaba pendiente.";
  }
  if (m.includes("completarse")) {
    return "Esta estadía ya estaba marcada como completada.";
  }
  return "Esta acción ya se había aplicado. Revisa la tarjeta actualizada.";
}
