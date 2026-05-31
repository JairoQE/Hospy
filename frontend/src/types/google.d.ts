interface GsiButtonConfiguration {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: string | number;
}

interface IdConfiguration {
  client_id?: string;
  callback?: (credentialResponse: { credential?: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface PromptMomentNotification {
  isDisplayMoment: () => boolean;
  isDisplayed: () => boolean;
  isNotDisplayed: () => boolean;
  getNotDisplayedReason: () => string;
  isSkippedMoment: () => boolean;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
}

interface GoogleAccountsId {
  initialize: (config: IdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: GsiButtonConfiguration) => void;
  prompt: (listener?: (notification: PromptMomentNotification) => void) => void;
  cancel: () => void;
}

interface Window {
  google?: {
    accounts: {
      id: GoogleAccountsId;
    };
  };
}
