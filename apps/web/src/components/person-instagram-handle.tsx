export function PersonInstagramHandle({ handle }: { handle: string }) {
  return (
    <bdi className="person-instagram-handle" dir="ltr" lang="en">
      @{handle}
    </bdi>
  );
}
