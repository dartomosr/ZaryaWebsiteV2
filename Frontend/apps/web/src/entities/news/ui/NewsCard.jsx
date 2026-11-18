import './news-card.css';

/** @param {{ item: import('../api/news.contract.js').NewsSummaryDto }} props */
export function NewsCard({ item }) {
  return (
    <article className="news-card">
      <div className="news-card__cover">
        <span aria-hidden="true" className="news-card__symbol">З</span>
        <img src={item.coverUrl} alt="" loading="lazy"
          onError={event => { event.currentTarget.hidden = true; }} />
      </div>
      <div className="news-card__body">
        <time dateTime={item.publishedAt}>
          {new Date(item.publishedAt).toLocaleDateString('ru-RU', { timeZone: 'UTC' })}
        </time>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
      </div>
    </article>
  );
}
