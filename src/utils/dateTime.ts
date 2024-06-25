class DateTime {
  static toSeconds(duration: string): number {
    if (duration) {
      const values = duration.split(':').map((it) => parseInt(it, 10));
      return values.reduce(
        (total, value, index) =>
          index === values.length - 1 ? total + value : (total + value) * 60,
        0,
      );
    }
    return 0;
  }

  private static pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  static toTime(duration: number): string {
    const h = Math.floor(duration / 3600);
    const m = Math.floor((duration - h * 3600) / 60);
    const s = duration - h * 3600 - m * 60;

    const time = [];

    if (h !== 0) {
      time.push(h);
    }

    time.push(m, s);

    return time.map(this.pad).join(':');
  }
}

export default DateTime;
