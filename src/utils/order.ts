import { OrderState } from '@modules/order/types';

export const getOrderStateAsString = (state: string) => {
  switch (state) {
    case '0':
      return OrderState.OPEN;
    case '1':
      return OrderState.PROVISIONED;
    case '2':
      return OrderState.CLOSED;
    case '3':
      return OrderState.MATCHED;
  }
};
