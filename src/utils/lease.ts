import { LeaseState } from '@modules/lease/types';

export const getLeaseStateAsString = (state: string) => {
  switch (state) {
    case '0':
      return LeaseState.ACTIVE;
    case '1':
      return LeaseState.TERMINATED;
  }
};
