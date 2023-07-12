import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as fs from "fs";
import { FileUpload } from "graphql-upload";
import {
  Between,
  FindOptionsWhere,
  In,
  LessThan,
  MoreThan,
  Repository,
} from "typeorm";
import { randomDefaultImagePath, saveImage } from "../images/image.utils";
import { ImagesService, ImageTypes } from "../images/images.service";
import { Image } from "../images/models/image.model";
import { EventAttendeesService } from "./event-attendees/event-attendees.service";
import {
  EventAttendee,
  EventAttendeeStatus,
} from "./event-attendees/models/event-attendee.model";
import { CreateEventInput } from "./models/create-event.input";
import { Event } from "./models/event.model";
import { EventsInput, EventTimeFrame } from "./models/events.input";
import { UpdateEventInput } from "./models/update-event.input";

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,

    @InjectRepository(EventAttendee)
    private eventAttendeeRepository: Repository<EventAttendee>,

    @Inject(forwardRef(() => EventAttendeesService))
    private eventAttendeesService: EventAttendeesService,

    private imagesService: ImagesService
  ) {}

  async getEvent(where: FindOptionsWhere<Event>, relations?: string[]) {
    return this.eventRepository.findOneOrFail({ where, relations });
  }

  async getFilteredEvents({ timeFrame, online }: EventsInput) {
    const where: FindOptionsWhere<Event> = { online };
    const now = new Date();

    if (timeFrame === EventTimeFrame.Past) {
      where.startsAt = LessThan(now);
    }
    if (timeFrame === EventTimeFrame.Future) {
      where.startsAt = MoreThan(now);
    }
    if (timeFrame === EventTimeFrame.ThisWeek) {
      const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      where.startsAt = Between(now, oneWeekFromNow);
    }
    return this.eventRepository.find({
      order: { updatedAt: "DESC" },
      where,
    });
  }

  async getAttendingStatus(id: number, userId: number) {
    const eventAttendee = await this.eventAttendeesService.getEventAttendee({
      eventId: id,
      userId,
    });
    return eventAttendee?.status || null;
  }

  async getCoverPhotosBatch(eventIds: number[]) {
    const coverPhotos = await this.imagesService.getImages({
      eventId: In(eventIds),
      imageType: ImageTypes.CoverPhoto,
    });
    const mappedCoverPhotos = eventIds.map(
      (id) =>
        coverPhotos.find((coverPhoto: Image) => coverPhoto.eventId === id) ||
        new Error(`Could not load cover photo for event: ${id}`)
    );
    return mappedCoverPhotos;
  }

  async createEvent(
    { coverPhoto, ...eventData }: CreateEventInput,
    userId: number
  ) {
    const event = await this.eventRepository.save(eventData);
    await this.eventAttendeeRepository.save({
      status: EventAttendeeStatus.Host,
      eventId: event.id,
      userId,
    });
    if (coverPhoto) {
      await this.saveCoverPhoto(event.id, coverPhoto);
    } else {
      await this.saveDefaultCoverPhoto(event.id);
    }
    return { event };
  }

  async updateEvent({ id, ...eventData }: UpdateEventInput) {
    await this.eventRepository.update(id, eventData);
    const event = await this.getEvent({ id });
    return { event };
  }

  async saveCoverPhoto(eventId: number, coverPhoto: Promise<FileUpload>) {
    const filename = await saveImage(coverPhoto);
    await this.deleteCoverPhoto(eventId);

    return this.imagesService.createImage({
      imageType: ImageTypes.CoverPhoto,
      filename,
      eventId,
    });
  }

  async saveDefaultCoverPhoto(eventId: number) {
    const sourcePath = randomDefaultImagePath();
    const filename = `${Date.now()}.jpeg`;
    const copyPath = `./uploads/${filename}`;

    fs.copyFile(sourcePath, copyPath, (err) => {
      if (err) {
        throw new Error(`Failed to save default cover photo: ${err}`);
      }
    });
    const image = await this.imagesService.createImage({
      imageType: ImageTypes.CoverPhoto,
      filename,
      eventId,
    });
    return image;
  }

  async deleteCoverPhoto(id: number) {
    await this.imagesService.deleteImage({
      imageType: ImageTypes.CoverPhoto,
      event: { id },
    });
  }

  async deleteEvent(id: number) {
    await this.eventRepository.delete(id);
    return true;
  }
}
