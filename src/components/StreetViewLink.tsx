import type { Coordinate } from "../game/types";
import { buildStreetViewExternalUrl } from "../utils/streetViewUrl";

type Props = { coordinate: Coordinate; placeName: string };

export function StreetViewLink({ coordinate, placeName }: Props) {
  const url = buildStreetViewExternalUrl(coordinate);

  if (!url) return <p className="street-view-unavailable" role="status">ストリートビューのリンクを作成できません。</p>;

  return <section className="street-view" aria-label="ストリートビュー"><p className="panel-kicker">LOOK AROUND</p><a className="street-view-link" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${placeName} 周辺のストリートビューを Google マップで開く`}>Google マップでストリートビューを見る <span aria-hidden="true">↗</span></a><p className="street-view-note">正解地点の周辺風景を、新しいタブで開きます。</p></section>;
}
