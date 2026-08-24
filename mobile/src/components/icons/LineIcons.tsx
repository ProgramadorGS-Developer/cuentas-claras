import Svg, { Circle, Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

// Set de íconos propios en línea (sin dependencias de icon-fonts externas),
// pensado para los círculos de "cómo funciona" y estados de la UI.

export function CartIcon({ size = 24, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 4h2l1.6 9.6a2 2 0 0 0 2 1.7h7.4a2 2 0 0 0 2-1.6L19.5 8H6.2"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="9.5" cy="19.5" r="1.4" stroke={color} strokeWidth={1.6} />
      <Circle cx="16.5" cy="19.5" r="1.4" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function WalletIcon({ size = 24, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path
        d="M14.5 12.2h3.8"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Circle cx="16.4" cy="12.2" r="0.9" fill={color} />
    </Svg>
  );
}

export function SwapIcon({ size = 24, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 8.5h11.5M17.5 8.5 14 5M18 15.5H6.5M6.5 15.5 10 19"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 20, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UsersIcon({ size = 24, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="8.5" r="2.6" stroke={color} strokeWidth={1.7} />
      <Path
        d="M3.8 19c.6-3 2.6-4.6 5.2-4.6s4.6 1.6 5.2 4.6"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Path
        d="M15.3 6.3c1.3.2 2.3 1.3 2.3 2.7 0 1.4-1 2.5-2.3 2.7"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M16.2 14.6c2 .5 3.4 1.9 3.9 4.3"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BellIcon({ size = 22, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 10.5a5.5 5.5 0 0 1 11 0c0 3.4.9 4.9 1.7 5.8H4.8c.8-.9 1.7-2.4 1.7-5.8Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path
        d="M10 19a2 2 0 0 0 4 0"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ClockIcon({ size = 24, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth={1.7} />
      <Path
        d="M12 8.2V12l2.8 1.8"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SettingsIcon({ size = 24, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="2.6" stroke={color} strokeWidth={1.7} />
      <Path
        d="M19.4 13.3a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1h-.2a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5v-.2a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 1 1.5h.1a1.6 1.6 0 0 0 1.8-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.5 1Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlusIcon({ size = 20, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ArrowLeftIcon({ size = 22, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5 8 12l7 7M8.5 12H20"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SendIcon({ size = 20, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12.5 19.5 5 13 19.5l-2.4-6.1L4 12.5Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M10.6 13.4 15 9" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 16, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6 6 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CheckIcon({ size = 14, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5 10 17 19 7"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ReceiptIcon({ size = 24, color = "#1A1A1A" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3.5h12v17l-2.2-1.4L13.6 20l-1.6-1.4L10.4 20l-2.2-1.4L6 20.5v-17Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M9 8h6M9 11.2h6M9 14.4h3.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
