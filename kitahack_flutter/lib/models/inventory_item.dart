class InventoryItem {
  final String name;
  final double quantity;
  final String unit;
  final DateTime expiryDate;
  final bool isAvailable;

  InventoryItem({
    required this.name,
    required this.quantity,
    required this.unit,
    required this.expiryDate,
    required this.isAvailable,
  });
}