const createCustomerCode = (clientName) => {
  // Split the full name into words
  const words = clientName.split(" ");

  // Extract the first letter of each word and concatenate them
  const initials = words.map((word) => word.charAt(0)).join("");

  return initials.slice(0, 4).toUpperCase();
};

export const generateWorkOrderNumber = (
  clientName,
  unitSerialNo,
  taskType,
  date
) => {
  const clientCode = createCustomerCode(clientName);

  // Get current date in YYYYMMDD format
  const shortDate = new Date(date)
    .toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "");

  const taskCode = taskType.charAt(0).toUpperCase();

  // Construct work order number
  const workOrderNumber = `${clientCode}-${shortDate}-${taskCode}-${unitSerialNo}`;

  return workOrderNumber;
};

export const createRandomPassword = () => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const length = 8;
  let randomString = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    randomString += charset.charAt(randomIndex);
  }

  return randomString;
};
