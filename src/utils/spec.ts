export const decompressProviderSpec = (input: string): object => {
  // Replace keys with the proper JSON key names
  let formattedString = input
    .replace(/n:/g, '"Name":')
    .replace(/r:/g, '"Region":')
    .replace(/a:/g, '"Attributes":')
    .replace(/k:/g, '"Key":')
    .replace(/v:/g, '"Value":');
  
  // Add quotes around string values (excluding numbers and already quoted values)
  formattedString = formattedString.replace(/:(\w+([./-]\w+)*)([},\]])/g, ':"$1"$3');

  // Parse the formatted string into JSON
  try {
    return JSON.parse(formattedString);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    throw error;
  }
}
