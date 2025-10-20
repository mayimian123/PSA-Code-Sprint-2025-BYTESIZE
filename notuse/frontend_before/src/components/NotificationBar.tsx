import styles from "./NotificationBar.module.css";

type Notification = {
  id: number;
  title: string;
  description: string;
  due: string;
};

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    title: "Submit Growth Check-in",
    description: "Share your Q3 reflections with your manager.",
    due: "Due Friday",
  },
  {
    id: 2,
    title: "Attend Wellness Circle",
    description: "Join the lunchtime session on mindful breaks.",
    due: "Tomorrow 12:30",
  },
  {
    id: 3,
    title: "Learning Hub Playlist",
    description: "2 new courses recommended for Operations track.",
    due: "New today",
  },
];

export function NotificationBar() {
  return (
    <aside className={styles.container}>
      <div className={styles.heading}>
        <span className={styles.title}>Notifications</span>
        <span className={styles.subtitle}>Stay on top of what matters</span>
      </div>
      <div className={styles.list}>
        {SAMPLE_NOTIFICATIONS.map((item) => (
          <div key={item.id} className={styles.card}>
            <div>
              <p className={styles.cardTitle}>{item.title}</p>
              <p className={styles.cardDescription}>{item.description}</p>
            </div>
            <span className={styles.due}>{item.due}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

