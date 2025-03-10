export const getStatusNumberFromFizzStatus = (status: string): number => {
  switch (status.toLowerCase()) {
    case 'active':
      return 2;
    case 'registered':
      return 1;
    case 'upgrade':
      return 2.1;
    default:
      return 3;
  }
};
