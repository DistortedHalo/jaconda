import { CornerBrand } from "./CornerBrand";

type LogoStampProps = {
  onClick?: () => void;
};

export function LogoStamp({ onClick }: LogoStampProps) {
  return <CornerBrand onClick={onClick} className="logo-stamp" />;
}
